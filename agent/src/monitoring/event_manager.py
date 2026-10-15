"""
SentinelGuard Monitoring Coordinator and Event Manager
Orchestrates telemetry collectors (Process, USB, Clipboard, Screen),
manages local persistent queuing, asynchronous network transport, and aggregate health reporting.
"""
import logging
from typing import Dict, Any, Optional, Callable

from ..api_client import ApiClient
from ..storage.event_queue import EventQueue
from ..transport.event_sender import EventSender
from .process_monitor import ProcessMonitor
from .usb_monitor import UsbMonitor
from .clipboard_monitor import ClipboardMonitor
from .screen_activity_monitor import ScreenActivityMonitor

logger = logging.getLogger(__name__)


class EventManager:

    def __init__(
        self,
        api_client: ApiClient,
        device_id_provider: Callable[[], str],
        credential_provider: Callable[[], Optional[str]],
        event_queue: Optional[EventQueue] = None
    ):
        self.device_id_provider = device_id_provider
        self.credential_provider = credential_provider
        self.event_queue = event_queue or EventQueue()

        # Initialize transport sender
        self.event_sender = EventSender(
            api_client=api_client,
            credential_provider=credential_provider,
            event_queue=self.event_queue,
            batch_size=50,
            send_interval=2.0,
            health_provider=self.get_telemetry_health
        )

        # Initialize monitoring modules
        self.process_monitor = ProcessMonitor(
            event_callback=self.on_event_detected,
            device_id_provider=self.device_id_provider,
            poll_interval=2.0
        )

        self.usb_monitor = UsbMonitor(
            event_callback=self.on_event_detected,
            device_id_provider=self.device_id_provider,
            poll_interval=3.0
        )

        self.clipboard_monitor = ClipboardMonitor(
            event_callback=self.on_event_detected,
            device_id_provider=self.device_id_provider,
            poll_interval=1.0
        )

        self.screen_monitor = ScreenActivityMonitor(
            event_callback=self.on_event_detected,
            device_id_provider=self.device_id_provider,
            poll_interval=3.0
        )

        self.is_running = False

    def start(self) -> None:
        """Starts all monitoring collectors and the transport sender."""
        logger.info("Starting SentinelGuard telemetry subsystem...")
        self.is_running = True

        # Start transport sender first so buffered events can drain
        self.event_sender.start()

        # Start individual monitors with independent isolation
        for name, monitor in [
            ("Process", self.process_monitor),
            ("USB", self.usb_monitor),
            ("Clipboard", self.clipboard_monitor),
            ("Screen", self.screen_monitor),
        ]:
            try:
                monitor.start()
            except Exception as e:
                logger.error("Failed to start %s monitor: %s", name, e)

        logger.info("All telemetry monitoring modules initialized")

    def stop(self) -> None:
        """Gracefully terminates all monitoring modules and transport worker."""
        logger.info("Stopping SentinelGuard telemetry subsystem...")
        self.is_running = False

        for name, monitor in [
            ("Process", self.process_monitor),
            ("USB", self.usb_monitor),
            ("Clipboard", self.clipboard_monitor),
            ("Screen", self.screen_monitor),
        ]:
            try:
                monitor.stop(timeout=2.0)
            except Exception as e:
                logger.warning("Error stopping %s monitor: %s", name, e)

        try:
            self.event_sender.stop(timeout=3.0)
        except Exception as e:
            logger.warning("Error stopping transport sender: %s", e)

        logger.info("Telemetry subsystem shutdown complete")

    def on_event_detected(self, event_dict: Dict[str, Any]) -> None:
        """Enqueues an event into the persistent bounded queue."""
        try:
            self.event_queue.enqueue(event_dict)
        except Exception as e:
            logger.error("Failed to persist event %s: %s", event_dict.get("eventId"), e)

    def get_telemetry_health(self) -> Dict[str, Any]:
        """Collects current monitoring status for reporting to backend."""
        statuses = [
            self.process_monitor.status,
            self.usb_monitor.status,
            self.clipboard_monitor.status,
            self.screen_monitor.status
        ]

        if not self.is_running:
            overall = "MONITORING_DISABLED"
        elif any(s == "DEGRADED" for s in statuses) or self.event_sender.status == "DEGRADED":
            overall = "MONITORING_DEGRADED"
        else:
            overall = "MONITORING_ACTIVE"

        errors = []
        if self.process_monitor.last_error:
            errors.append(f"Process: {self.process_monitor.last_error}")
        if self.usb_monitor.last_error:
            errors.append(f"USB: {self.usb_monitor.last_error}")
        if self.clipboard_monitor.last_error:
            errors.append(f"Clipboard: {self.clipboard_monitor.last_error}")
        if self.screen_monitor.last_error:
            errors.append(f"Screen: {self.screen_monitor.last_error}")
        if self.event_sender.last_error:
            errors.append(f"Transport: {self.event_sender.last_error}")

        return {
            "monitoringStatus": overall,
            "processMonitorStatus": self.process_monitor.status,
            "usbMonitorStatus": self.usb_monitor.status,
            "clipboardMonitorStatus": self.clipboard_monitor.status,
            "screenMonitorStatus": self.screen_monitor.status,
            "queuePendingCount": self.event_queue.get_pending_count(),
            "monitoringErrors": "; ".join(errors) if errors else None
        }
