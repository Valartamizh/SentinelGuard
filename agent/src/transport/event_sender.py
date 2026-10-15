"""
SentinelGuard Agent Telemetry Transport
Asynchronously drains the persistent event queue and transmits batches to the backend.
Implements exponential backoff, rate limiting, and clean thread lifecycle.
"""
import logging
import threading
import time
from typing import Optional, Callable, Dict, Any

from .. import config
from ..api_client import ApiClient
from ..storage.event_queue import EventQueue

logger = logging.getLogger(__name__)


class EventSender:

    def __init__(
        self,
        api_client: ApiClient,
        credential_provider: Callable[[], Optional[str]],
        event_queue: EventQueue,
        batch_size: int = 50,
        send_interval: float = 2.0,
        health_provider: Optional[Callable[[], Dict[str, Any]]] = None
    ):
        self.api_client = api_client
        self.credential_provider = credential_provider
        self.event_queue = event_queue
        self.batch_size = batch_size
        self.send_interval = send_interval
        self.health_provider = health_provider

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._current_backoff = config.INITIAL_BACKOFF_SECONDS
        self.last_successful_upload: Optional[float] = None
        self.last_error: Optional[str] = None
        self.status = "INITIALIZING"

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self.status = "ACTIVE"
        self._thread = threading.Thread(target=self._run_loop, name="SentinelEventSender", daemon=True)
        self._thread.start()
        logger.info("Event transport sender thread started")

    def stop(self, timeout: float = 5.0) -> None:
        self.status = "STOPPING"
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        self.status = "STOPPED"
        logger.info("Event transport sender thread stopped cleanly")

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                batch = self.event_queue.peek_batch(self.batch_size)
                if not batch:
                    # Queue is empty, wait before polling again
                    self._stop_event.wait(self.send_interval)
                    continue

                credential = self.credential_provider()
                if not credential:
                    logger.warning("No device credential available; pausing event transport")
                    self._stop_event.wait(self.send_interval)
                    continue

                # Prepare payload with piggybacked telemetry health
                health_info = self.health_provider() if self.health_provider else {}
                batch_payload = {
                    "events": batch,
                    "monitoringStatus": health_info.get("monitoringStatus", "MONITORING_ACTIVE"),
                    "processMonitorStatus": health_info.get("processMonitorStatus", "ACTIVE"),
                    "usbMonitorStatus": health_info.get("usbMonitorStatus", "ACTIVE"),
                    "clipboardMonitorStatus": health_info.get("clipboardMonitorStatus", "ACTIVE"),
                    "screenMonitorStatus": health_info.get("screenMonitorStatus", "ACTIVE"),
                    "queuePendingCount": self.event_queue.get_pending_count(),
                    "monitoringErrors": health_info.get("monitoringErrors")
                }

                # Attempt delivery
                resp = self.api_client.send_event_batch(credential, batch_payload)
                event_uuids = [item["eventId"] for item in batch if "eventId" in item]
                deleted = self.event_queue.delete_batch(event_uuids)

                self.last_successful_upload = time.time()
                self._current_backoff = config.INITIAL_BACKOFF_SECONDS
                self.last_error = None
                self.status = "ACTIVE"

                logger.debug(
                    "Successfully delivered batch of %d events (%d cleared from local queue)",
                    len(batch), deleted
                )

                # Small delay between consecutive batches to prevent overwhelming the network
                self._stop_event.wait(0.5)

            except PermissionError as e:
                self.last_error = f"Authentication rejected: {e}"
                self.status = "DEGRADED"
                logger.error("Event delivery rejected (device may be revoked): %s", e)
                self._stop_event.wait(self._current_backoff)
                self._current_backoff = min(
                    self._current_backoff * config.BACKOFF_FACTOR,
                    config.MAX_BACKOFF_SECONDS
                )

            except Exception as e:
                self.last_error = str(e)
                logger.warning(
                    "Failed to transmit event batch: %s. Retrying in %ds (exponential backoff)...",
                    e, self._current_backoff
                )
                self._stop_event.wait(self._current_backoff)
                self._current_backoff = min(
                    self._current_backoff * config.BACKOFF_FACTOR,
                    config.MAX_BACKOFF_SECONDS
                )
