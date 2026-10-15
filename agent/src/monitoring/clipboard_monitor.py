"""
SentinelGuard Privacy-Preserving Clipboard Activity Monitor
Monitors clipboard modification events on Windows endpoints using Windows Clipboard Sequence Numbers.
ZERO CONTENT INSPECTION: Does NOT read text, hashes, files, images, or passwords.
Captures exclusively event type, timestamp, sequence number, and format category.
"""
import ctypes
from datetime import datetime, timezone
import logging
import sys
import threading
import uuid
from typing import Dict, Any, Callable, Optional

logger = logging.getLogger(__name__)

# Standard Windows Clipboard Formats
CF_TEXT = 1
CF_BITMAP = 2
CF_UNICODETEXT = 13
CF_HDROP = 15  # File list handle


def get_clipboard_sequence_number() -> int:
    """Returns the Windows clipboard sequence number without opening or reading the clipboard."""
    if sys.platform == "win32":
        try:
            return ctypes.windll.user32.GetClipboardSequenceNumber()
        except Exception as e:
            logger.debug("Error getting clipboard sequence number: %s", e)
    return 0


def get_format_category() -> str:
    """Queries format category availability without opening or reading the content."""
    if sys.platform != "win32":
        return "UNKNOWN"

    try:
        user32 = ctypes.windll.user32
        if user32.IsClipboardFormatAvailable(CF_UNICODETEXT) or user32.IsClipboardFormatAvailable(CF_TEXT):
            return "TEXT"
        elif user32.IsClipboardFormatAvailable(CF_HDROP):
            return "FILES"
        elif user32.IsClipboardFormatAvailable(CF_BITMAP):
            return "IMAGE"
        else:
            return "OTHER_DATA"
    except Exception:
        return "GENERIC"


class ClipboardMonitor:

    def __init__(
        self,
        event_callback: Callable[[Dict[str, Any]], None],
        device_id_provider: Callable[[], str],
        poll_interval: float = 1.0
    ):
        self.event_callback = event_callback
        self.device_id_provider = device_id_provider
        self.poll_interval = poll_interval

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_sequence: Optional[int] = None
        self.status = "INITIALIZING"
        self.last_error: Optional[str] = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._last_sequence = get_clipboard_sequence_number()
        self.status = "ACTIVE"
        self._thread = threading.Thread(target=self._run_loop, name="SentinelClipboardMonitor", daemon=True)
        self._thread.start()
        logger.info("Clipboard metadata monitor started (initial seq: %s)", self._last_sequence)

    def stop(self, timeout: float = 5.0) -> None:
        self.status = "STOPPING"
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        self.status = "STOPPED"
        logger.info("Clipboard metadata monitor stopped")

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                current_seq = get_clipboard_sequence_number()

                # If sequence number changed (and not initial pass)
                if self._last_sequence is not None and current_seq != self._last_sequence and current_seq != 0:
                    format_cat = get_format_category()
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                    device_id = self.device_id_provider()

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "CLIPBOARD_CHANGED",
                        "category": "CLIPBOARD",
                        "severity": "INFO",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "formatCategory": format_cat,
                            "sequenceNumber": current_seq
                        }
                    }
                    self.event_callback(event)
                    logger.debug("Clipboard changed (seq: %d, format: %s)", current_seq, format_cat)

                self._last_sequence = current_seq
                self.status = "ACTIVE"
                self.last_error = None

            except Exception as e:
                self.last_error = str(e)
                self.status = "DEGRADED"
                logger.error("Error checking clipboard sequence: %s", e)

            self._stop_event.wait(self.poll_interval)
