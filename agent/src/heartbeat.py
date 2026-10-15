"""
SentinelGuard Agent Heartbeat & Telemetry Orchestration Service
Periodically transmits telemetry heartbeats to SentinelGuard backend with exponential backoff on network failures.
Orchestrates Phase 3 monitoring collectors (Process, USB, Clipboard, Screen Activity)
and persistent local telemetry queue draining.
"""
from datetime import datetime, timezone
import logging
import signal
import sys
import time
from typing import Optional

from . import config
from .api_client import ApiClient
from .credential_store import CredentialStore
from .monitoring.event_manager import EventManager

logger = logging.getLogger(__name__)


def run_heartbeat_loop(interval: Optional[int] = None) -> None:
    """
    Runs the agent heartbeat and monitoring loop.
    Sends authenticated heartbeats every `interval` seconds (default 30s).
    Runs real-time process, USB, clipboard, and screen application telemetry in parallel.
    Catches SIGINT/Ctrl+C to terminate all subsystems gracefully.
    """
    heartbeat_interval = interval or config.HEARTBEAT_INTERVAL_SECONDS
    store = CredentialStore()

    if not store.is_enrolled():
        print("[ERROR] Device is not enrolled in SentinelGuard.")
        print("Please run enrollment first:")
        print("  python -m src.main enroll")
        sys.exit(1)

    device_id = store.get_device_id()
    device_code = store.get_device_code()
    credential = store.get_credential()

    if not credential:
        print("[ERROR] Could not decrypt device credential via Windows DPAPI.")
        sys.exit(1)

    print("============================================================")
    print("  SentinelGuard Windows Endpoint Monitoring Agent")
    print("============================================================")
    print(f"  Device Code   : {device_code}")
    print(f"  Device ID     : {device_id}")
    print(f"  Backend URL   : {config.BACKEND_URL}")
    print(f"  Interval      : Every {heartbeat_interval} seconds")
    print(f"  Agent Version : {config.AGENT_VERSION}")
    print("  Monitors      : Process | USB | Clipboard | Screen Apps")
    print("  Press Ctrl+C to stop the agent gracefully.")
    print("============================================================")

    client = ApiClient(config.BACKEND_URL)
    current_backoff = config.INITIAL_BACKOFF_SECONDS
    stop_requested = False

    # Initialize and start Phase 3 telemetry subsystem
    event_manager = EventManager(
        api_client=client,
        device_id_provider=lambda: device_id,
        credential_provider=lambda: credential
    )
    event_manager.start()

    def handle_sigint(sig, frame):
        nonlocal stop_requested
        print("\n[*] Stopping SentinelGuard agent gracefully...")
        stop_requested = True

    signal.signal(signal.SIGINT, handle_sigint)

    heartbeat_count = 0

    try:
        while not stop_requested:
            try:
                heartbeat_count += 1
                now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                print(f"[{now_str}] Sending heartbeat #{heartbeat_count}...", end=" ", flush=True)

                health = event_manager.get_telemetry_health()

                resp = client.send_heartbeat(
                    device_id=device_id,
                    credential=credential,
                    agent_version=config.AGENT_VERSION,
                    status="RUNNING",
                    monitoring_status=health.get("monitoringStatus"),
                    process_monitor_status=health.get("processMonitorStatus"),
                    usb_monitor_status=health.get("usbMonitorStatus"),
                    clipboard_monitor_status=health.get("clipboardMonitorStatus"),
                    screen_monitor_status=health.get("screenMonitorStatus"),
                    queue_pending_count=health.get("queuePendingCount"),
                    monitoring_errors=health.get("monitoringErrors")
                )

                server_time = resp.get("serverTime", "")
                q_count = health.get("queuePendingCount", 0)
                print(f"SUCCESS (Server Time: {server_time}, Queued Events: {q_count})")

                # Update local last-heartbeat timestamp
                store.update_last_heartbeat(now_str)

                # Reset backoff on success
                current_backoff = config.INITIAL_BACKOFF_SECONDS

                # Sleep in 1-second chunks to respond quickly to Ctrl+C
                for _ in range(heartbeat_interval):
                    if stop_requested:
                        break
                    time.sleep(1)

            except PermissionError as e:
                print(f"FAILED (Authentication Error: {e})")
                print("[!] The device credential was rejected by the server. Device may be REVOKED.")
                print("[!] Stopping heartbeat service.")
                break

            except Exception as e:
                print(f"FAILED (Network/Server Error: {e})")
                print(f"[*] Retrying in {current_backoff} seconds (exponential backoff)...")

                for _ in range(current_backoff):
                    if stop_requested:
                        break
                    time.sleep(1)

                current_backoff = min(current_backoff * config.BACKOFF_FACTOR, config.MAX_BACKOFF_SECONDS)
    finally:
        event_manager.stop()
        print("[OK] SentinelGuard agent stopped cleanly.")
