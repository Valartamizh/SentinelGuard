"""
SentinelGuard Process Execution Monitor
Monitors process lifecycles on Windows endpoints using psutil.
Establishes a baseline on launch, identifies process start and stop events,
and enforces strict privacy constraints (no command line args, no memory).
"""
from datetime import datetime, timezone
import logging
import threading
import uuid
from typing import Dict, Any, Callable, Optional, Tuple
import psutil

logger = logging.getLogger(__name__)


class ProcessMonitor:

    def __init__(
        self,
        event_callback: Callable[[Dict[str, Any]], None],
        device_id_provider: Callable[[], str],
        poll_interval: float = 2.0
    ):
        self.event_callback = event_callback
        self.device_id_provider = device_id_provider
        self.poll_interval = poll_interval

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._known_processes: Dict[Tuple[int, float], Dict[str, Any]] = {}
        self.status = "INITIALIZING"
        self.last_error: Optional[str] = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._establish_baseline()
        self.status = "ACTIVE"
        self._thread = threading.Thread(target=self._run_loop, name="SentinelProcessMonitor", daemon=True)
        self._thread.start()
        logger.info("Process monitor started (baseline: %d processes)", len(self._known_processes))

    def stop(self, timeout: float = 5.0) -> None:
        self.status = "STOPPING"
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        self.status = "STOPPED"
        logger.info("Process monitor stopped")

    def _get_current_processes(self) -> Dict[Tuple[int, float], Dict[str, Any]]:
        current: Dict[Tuple[int, float], Dict[str, Any]] = {}
        for p in psutil.process_iter(['pid', 'name', 'exe', 'ppid', 'create_time']):
            try:
                info = p.info
                pid = info.get('pid')
                create_time = info.get('create_time') or 0.0
                if pid is not None:
                    current[(pid, create_time)] = {
                        "pid": pid,
                        "name": info.get('name') or "unknown",
                        "exe": info.get('exe'),
                        "ppid": info.get('ppid'),
                        "create_time": create_time
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
            except Exception as e:
                logger.debug("Transient error inspecting process: %s", e)
                continue
        return current

    def _establish_baseline(self) -> None:
        """Takes an initial process baseline without generating events."""
        self._known_processes = self._get_current_processes()
        logger.debug("Established initial process baseline with %d processes", len(self._known_processes))

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                current_processes = self._get_current_processes()
                device_id = self.device_id_provider()

                # Detect newly created processes
                new_keys = set(current_processes.keys()) - set(self._known_processes.keys())
                for key in new_keys:
                    pinfo = current_processes[key]
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "PROCESS_STARTED",
                        "category": "PROCESS",
                        "severity": "INFO",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "processName": pinfo["name"],
                            "pid": pinfo["pid"],
                            "ppid": pinfo["ppid"],
                            "executablePath": pinfo["exe"],
                            "createTime": pinfo["create_time"]
                        }
                    }
                    self.event_callback(event)

                # Detect terminated processes
                stopped_keys = set(self._known_processes.keys()) - set(current_processes.keys())
                for key in stopped_keys:
                    pinfo = self._known_processes[key]
                    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    event = {
                        "eventId": str(uuid.uuid4()),
                        "deviceId": device_id,
                        "eventType": "PROCESS_STOPPED",
                        "category": "PROCESS",
                        "severity": "INFO",
                        "occurredAt": now_iso,
                        "source": "WINDOWS_AGENT",
                        "details": {
                            "processName": pinfo["name"],
                            "pid": pinfo["pid"],
                            "ppid": pinfo["ppid"],
                            "executablePath": pinfo["exe"]
                        }
                    }
                    self.event_callback(event)

                self._known_processes = current_processes
                self.status = "ACTIVE"
                self.last_error = None

            except Exception as e:
                self.last_error = str(e)
                self.status = "DEGRADED"
                logger.error("Error during process monitoring scan: %s", e)

            self._stop_event.wait(self.poll_interval)
