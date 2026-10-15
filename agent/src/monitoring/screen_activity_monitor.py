"""
SentinelGuard Screen Recording and Sharing Application Monitor
Detects processes associated with screen recording or remote collaboration / screen sharing.
Distinguishes application presence from confirmed recording/sharing activity.
ZERO AUDIO/VIDEO/SCREENSHOT CAPTURE.
"""
from datetime import datetime, timezone
import logging
import threading
import uuid
from typing import Dict, Any, Callable, Optional, Set, Tuple
import psutil

logger = logging.getLogger(__name__)

# Configurable Catalog of Screen Recording and Sharing Applications
DETECTION_CATALOG = {
    # Screen Recording Applications
    "obs64.exe": {"name": "OBS Studio (64-bit)", "category": "SCREEN_RECORDING"},
    "obs32.exe": {"name": "OBS Studio (32-bit)", "category": "SCREEN_RECORDING"},
    "obs.exe": {"name": "OBS Studio", "category": "SCREEN_RECORDING"},
    "bdcam.exe": {"name": "Bandicam", "category": "SCREEN_RECORDING"},
    "camtasia.exe": {"name": "Camtasia Studio", "category": "SCREEN_RECORDING"},
    "sharex.exe": {"name": "ShareX Screen Capture", "category": "SCREEN_RECORDING"},
    "snagit32.exe": {"name": "TechSmith Snagit", "category": "SCREEN_RECORDING"},
    "snagiteditor.exe": {"name": "TechSmith Snagit Editor", "category": "SCREEN_RECORDING"},

    # Screen Sharing / Remote Collaboration Applications
    "teams.exe": {"name": "Microsoft Teams", "category": "SCREEN_SHARING"},
    "ms-teams.exe": {"name": "Microsoft Teams (Modern)", "category": "SCREEN_SHARING"},
    "zoom.exe": {"name": "Zoom Meetings", "category": "SCREEN_SHARING"},
    "chrome.exe": {"name": "Google Chrome (Web Collaboration)", "category": "SCREEN_SHARING"},
    "anydesk.exe": {"name": "AnyDesk Remote Desktop", "category": "SCREEN_SHARING"},
    "teamviewer.exe": {"name": "TeamViewer Remote Desktop", "category": "SCREEN_SHARING"},
}


class ScreenActivityMonitor:

    def __init__(
        self,
        event_callback: Callable[[Dict[str, Any]], None],
        device_id_provider: Callable[[], str],
        poll_interval: float = 3.0,
        catalog: Optional[Dict[str, Dict[str, str]]] = None
    ):
        self.event_callback = event_callback
        self.device_id_provider = device_id_provider
        self.poll_interval = poll_interval
        self.catalog = catalog or DETECTION_CATALOG

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._active_catalog_pids: Dict[int, Dict[str, Any]] = {}
        self.status = "INITIALIZING"
        self.last_error: Optional[str] = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._establish_baseline()
        self.status = "ACTIVE"
        self._thread = threading.Thread(target=self._run_loop, name="SentinelScreenMonitor", daemon=True)
        self._thread.start()
        logger.info("Screen activity monitor started (baseline: %d catalog processes)", len(self._active_catalog_pids))

    def stop(self, timeout: float = 5.0) -> None:
        self.status = "STOPPING"
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        self.status = "STOPPED"
        logger.info("Screen activity monitor stopped")

    def _scan_catalog_processes(self) -> Dict[int, Dict[str, Any]]:
        running_catalog: Dict[int, Dict[str, Any]] = {}
        for p in psutil.process_iter(['pid', 'name', 'exe', 'create_time']):
            try:
                name = (p.info.get('name') or "").lower()
                if name in self.catalog:
                    meta = self.catalog[name]
                    running_catalog[p.info['pid']] = {
                        "pid": p.info['pid'],
                        "processName": name,
                        "appName": meta["name"],
                        "category": meta["category"],
                        "exe": p.info.get('exe'),
                        "create_time": p.info.get('create_time') or 0.0
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
            except Exception as e:
                logger.debug("Error checking catalog process: %s", e)
        return running_catalog

    def _establish_baseline(self) -> None:
        self._active_catalog_pids = self._scan_catalog_processes()
        logger.debug("Screen monitor baseline found %d existing catalog instances", len(self._active_catalog_pids))

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                current_catalog = self._scan_catalog_processes()
                device_id = self.device_id_provider()

                # Detect newly launched catalog applications
                new_pids = set(current_catalog.keys()) - set(self._active_catalog_pids.keys())
                for pid in new_pids:
                    app = current_catalog[pid]
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "APPLICATION_DETECTED",
                        "category": app["category"],
                        "severity": "LOW" if app["category"] == "SCREEN_SHARING" else "MEDIUM",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "processName": app["processName"],
                            "applicationName": app["appName"],
                            "pid": app["pid"],
                            "executablePath": app["exe"],
                            "activeCaptureConfirmed": False,
                            "note": "Known application detected; active capture or recording unconfirmed"
                        }
                    }
                    self.event_callback(event)
                    logger.info("Known application detected: %s (PID: %d)", app["appName"], pid)

                # Detect exited catalog applications
                exited_pids = set(self._active_catalog_pids.keys()) - set(current_catalog.keys())
                for pid in exited_pids:
                    app = self._active_catalog_pids[pid]
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "APPLICATION_EXITED",
                        "category": app["category"],
                        "severity": "INFO",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "processName": app["processName"],
                            "applicationName": app["appName"],
                            "pid": pid,
                            "activeCaptureConfirmed": False
                        }
                    }
                    self.event_callback(event)
                    logger.info("Known application exited: %s (PID: %d)", app["appName"], pid)

                self._active_catalog_pids = current_catalog
                self.status = "ACTIVE"
                self.last_error = None

            except Exception as e:
                self.last_error = str(e)
                self.status = "DEGRADED"
                logger.error("Error in screen activity scan: %s", e)

            self._stop_event.wait(self.poll_interval)
