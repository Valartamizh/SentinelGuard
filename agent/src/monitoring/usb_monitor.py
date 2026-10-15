"""
SentinelGuard USB Storage Activity Monitor
Monitors connection and disconnection of removable USB storage devices on Windows.
Enforces privacy constraints (strictly NO file reading, NO file indexing).
"""
import ctypes
from datetime import datetime, timezone
import logging
import os
import sys
import threading
import uuid
from typing import Dict, Any, Callable, Optional, Set
import psutil

logger = logging.getLogger(__name__)

DRIVE_REMOVABLE = 2


def is_removable_drive(mountpoint: str) -> bool:
    """Checks whether a mountpoint or drive letter represents removable storage."""
    try:
        if sys.platform == "win32":
            drive = mountpoint.rstrip("\\") + "\\"
            drive_type = ctypes.windll.kernel32.GetDriveTypeW(drive)
            return drive_type == DRIVE_REMOVABLE
    except Exception as e:
        logger.debug("Error checking drive type for %s: %s", mountpoint, e)
    return False


class UsbMonitor:

    def __init__(
        self,
        event_callback: Callable[[Dict[str, Any]], None],
        device_id_provider: Callable[[], str],
        poll_interval: float = 3.0
    ):
        self.event_callback = event_callback
        self.device_id_provider = device_id_provider
        self.poll_interval = poll_interval

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._known_drives: Dict[str, Dict[str, Any]] = {}
        self.status = "INITIALIZING"
        self.last_error: Optional[str] = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._establish_baseline()
        self.status = "ACTIVE"
        self._thread = threading.Thread(target=self._run_loop, name="SentinelUsbMonitor", daemon=True)
        self._thread.start()
        logger.info("USB storage monitor started (baseline: %d removable drives)", len(self._known_drives))

    def stop(self, timeout: float = 5.0) -> None:
        self.status = "STOPPING"
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        self.status = "STOPPED"
        logger.info("USB storage monitor stopped")

    def _get_current_removable_drives(self) -> Dict[str, Dict[str, Any]]:
        removable: Dict[str, Dict[str, Any]] = {}
        try:
            partitions = psutil.disk_partitions(all=True)
            for part in partitions:
                mount = part.mountpoint
                # Check opts and Windows drive type
                is_remov = "removable" in part.opts.lower() or is_removable_drive(mount)
                if is_remov:
                    drive_id = part.device or mount
                    removable[drive_id] = {
                        "device": part.device,
                        "mountpoint": mount,
                        "fstype": part.fstype,
                        "opts": part.opts
                    }
        except Exception as e:
            logger.debug("Error querying disk partitions: %s", e)
        return removable

    def _establish_baseline(self) -> None:
        self._known_drives = self._get_current_removable_drives()
        logger.debug("Established USB baseline with %d drives", len(self._known_drives))

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                current_drives = self._get_current_removable_drives()
                device_id = self.device_id_provider()

                # Detect newly connected USB drives
                connected_ids = set(current_drives.keys()) - set(self._known_drives.keys())
                for drive_id in connected_ids:
                    info = current_drives[drive_id]
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "USB_CONNECTED",
                        "category": "USB",
                        "severity": "LOW",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "deviceCategory": "USB",
                            "driveLetter": info["mountpoint"].rstrip("\\"),
                            "deviceDisplayName": f"Removable Storage ({info['mountpoint']})",
                            "mountPoint": info["mountpoint"],
                            "filesystem": info["fstype"]
                        }
                    }
                    self.event_callback(event)
                    logger.info("USB Connected: %s", info["mountpoint"])

                # Detect disconnected USB drives
                disconnected_ids = set(self._known_drives.keys()) - set(current_drives.keys())
                for drive_id in disconnected_ids:
                    info = self._known_drives[drive_id]
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "USB_DISCONNECTED",
                        "category": "USB",
                        "severity": "LOW",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "deviceCategory": "USB",
                            "driveLetter": info["mountpoint"].rstrip("\\"),
                            "deviceDisplayName": f"Removable Storage ({info['mountpoint']})",
                            "mountPoint": info["mountpoint"]
                        }
                    }
                    self.event_callback(event)
                    logger.info("USB Disconnected: %s", info["mountpoint"])

                self._known_drives = current_drives
                self.status = "ACTIVE"
                self.last_error = None

            except Exception as e:
                self.last_error = str(e)
                self.status = "DEGRADED"
                logger.error("Error during USB scan: %s", e)

            self._stop_event.wait(self.poll_interval)
