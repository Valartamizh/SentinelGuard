"""
SentinelGuard Phase 3 — End-to-End Live Verification Suite
Executes end-to-end integration verification against active Spring Boot backend,
PostgreSQL database, and Python Windows agent telemetry subsystems.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path
import urllib.request
import urllib.error

# Ensure agent src is importable
agent_dir = Path(__file__).resolve().parent / "agent"
sys.path.insert(0, str(agent_dir))

from src.credential_store import CredentialStore
from src.api_client import ApiClient
from src.device_info import get_device_info
from src.storage.event_queue import EventQueue
from src.monitoring.event_manager import EventManager
from src.monitoring.clipboard_monitor import get_clipboard_sequence_number

BASE_URL = "http://localhost:8080/api/v1"


def http_json(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_json = json.loads(content)
        except Exception:
            err_json = {"raw": content}
        return e.code, err_json


def main():
    print("=" * 70)
    print("  SENTINELGUARD PHASE 3 — LIVE END-TO-END TELEMETRY VERIFICATION")
    print("=" * 70)

    # 1. Health check
    print("\n[Step 1] Verifying Spring Boot Backend Health...")
    status, health = http_json("GET", "/health")
    assert status == 200, f"Health check failed: {status}"
    print(f"  --> OK: Backend Status = {health.get('status')} ({health.get('service')})")

    # 2. Administrator Login
    print("\n[Step 2] Administrator Login via JWT...")
    status, auth_resp = http_json("POST", "/auth/login", {
        "username": "admin",
        "password": "SentinelAdmin2024!"
    })
    assert status == 200, f"Admin login failed: {status}"
    admin_token = auth_resp["token"]
    print(f"  --> OK: JWT issued for '{auth_resp['username']}'")

    # 3. Read Enrolled Device Identity from DPAPI Credential Store
    print("\n[Step 3] Loading Enrolled Device Identity (Windows DPAPI)...")
    store = CredentialStore()
    client = ApiClient("http://localhost:8080")
    device_id = None
    credential = None
    device_code = None

    if store.is_enrolled():
        dev_id = store.get_device_id()
        st, dev_info = http_json("GET", f"/admin/devices/{dev_id}", token=admin_token)
        if st == 200 and dev_info.get("connectivityStatus") != "REVOKED":
            device_id = dev_id
            device_code = store.get_device_code()
            credential = store.get_credential()

    if not device_id or not credential:
        print("  --> Device not enrolled or is revoked. Enrolling active test device...")
        ts = int(time.time())
        _, dept = http_json("POST", "/admin/departments", {"name": f"Telemetry Ops {ts}"}, token=admin_token)
        _, emp = http_json("POST", "/admin/employees", {
            "departmentId": dept["id"],
            "fullName": "Telemetry Test Employee",
            "employeeCode": f"EMP-TEL-{ts % 10000}",
            "status": "ACTIVE"
        }, token=admin_token)
        _, token_resp = http_json("POST", "/admin/enrollment-tokens", {"employeeId": emp["id"]}, token=admin_token)
        enrollment_token = token_resp["enrollmentToken"]

        info = get_device_info()
        enroll_res = client.enroll(enrollment_token, info)
        device_id = enroll_res["deviceId"]
        device_code = enroll_res["deviceCode"]
        credential = enroll_res["deviceCredential"]
        store.save_identity(device_id, device_code, credential)
        print(f"  --> Fresh enrollment completed: Device Code = {device_code}")

    print(f"  --> OK: Device Code = {device_code}, Device ID = {device_id}")

    # 4. Verify Phase 2 Heartbeat API with Monitoring Health Metadata
    print("\n[Step 4] Transmitting Authenticated Heartbeat with Telemetry Metadata...")
    hb_resp = client.send_heartbeat(
        device_id=device_id,
        credential=credential,
        agent_version="1.0.0",
        status="RUNNING",
        monitoring_status="MONITORING_ACTIVE",
        process_monitor_status="ACTIVE",
        usb_monitor_status="ACTIVE",
        clipboard_monitor_status="ACTIVE",
        screen_monitor_status="ACTIVE",
        queue_pending_count=0
    )
    assert hb_resp.get("status") == "ACCEPTED", f"Heartbeat failed: {hb_resp}"
    print(f"  --> OK: Heartbeat accepted (Server Time: {hb_resp.get('serverTime')})")

    # 5. Initialize Agent Subsystems
    print("\n[Step 5] Initializing Local Event Queue and Telemetry Subsystem...")
    test_queue = EventQueue()
    event_manager = EventManager(
        api_client=client,
        device_id_provider=lambda: device_id,
        credential_provider=lambda: credential,
        event_queue=test_queue
    )
    event_manager.start()
    time.sleep(1.5)  # Allow monitors to baseline
    health = event_manager.get_telemetry_health()
    print(f"  --> Subsystem Health: {health['monitoringStatus']}")
    print(f"  --> Process Monitor  : {health['processMonitorStatus']}")
    print(f"  --> USB Monitor      : {health['usbMonitorStatus']}")
    print(f"  --> Clipboard Monitor: {health['clipboardMonitorStatus']}")
    print(f"  --> Screen Monitor   : {health['screenMonitorStatus']}")

    # 6. Live Process Execution Test (Spawn Notepad.exe -> Stop Notepad.exe)
    print("\n[Step 6] Testing Real-Time Process Execution Monitoring (Notepad)...")
    print("  --> Spawning notepad.exe test process...")
    proc = subprocess.Popen(["notepad.exe"])
    time.sleep(3.0)  # Allow process monitor to detect launch

    print("  --> Terminating notepad.exe test process...")
    proc.terminate()
    proc.wait()
    time.sleep(3.0)  # Allow process monitor to detect termination

    # Allow sender thread to transmit batch to backend
    time.sleep(3.0)

    # 7. Privacy-Preserving Clipboard Metadata Test
    print("\n[Step 7] Testing Privacy-Preserving Clipboard Monitoring...")
    initial_seq = get_clipboard_sequence_number()
    print(f"  --> Initial clipboard sequence number: {initial_seq}")
    # Copy harmless string via PowerShell to trigger sequence increment
    subprocess.run(["powershell", "-Command", "Set-Clipboard -Value 'SentinelGuard Harmless Test Text 12345'"], check=True)
    time.sleep(2.0)
    new_seq = get_clipboard_sequence_number()
    print(f"  --> Post-copy clipboard sequence number: {new_seq} (Changed: {new_seq != initial_seq})")
    time.sleep(3.0)  # Allow sender thread to transmit batch

    # Stop monitoring subsystem cleanly
    event_manager.stop()
    print("  --> Telemetry subsystem stopped cleanly.")

    # 8. Verify Events Ingested in PostgreSQL via Administrator API
    print("\n[Step 8] Verifying Persisted Telemetry Events via Administrator API...")
    status, events_page = http_json("GET", "/events?size=50", token=admin_token)
    assert status == 200, f"Failed to query events: {status}"
    total_events = events_page.get("totalElements", 0)
    events_list = events_page.get("content", [])
    print(f"  --> Total Events Ingested: {total_events}")
    assert total_events > 0, "Expected at least 1 telemetry event to be ingested!"

    # Verify process events found
    proc_events = [e for e in events_list if e.get("category") == "PROCESS"]
    print(f"  --> Process Events Found: {len(proc_events)}")
    for pe in proc_events:
        details = pe.get("details", {})
        print(f"      [{pe.get('eventType')}] {details.get('processName')} (PID: {details.get('pid')}) at {pe.get('occurredAt')}")
        # Verify privacy: no command line arguments or memory
        assert "cmdline" not in details, "Command line args must NOT be captured!"

    # Verify clipboard events found
    clip_events = [e for e in events_list if e.get("category") == "CLIPBOARD"]
    print(f"  --> Clipboard Events Found: {len(clip_events)}")
    for ce in clip_events:
        details = ce.get("details", {})
        print(f"      [{ce.get('eventType')}] Format: {details.get('formatCategory')}, Seq: {details.get('sequenceNumber')}")
        # Verify privacy: zero content
        assert "text" not in details, "Clipboard text must NOT be captured!"
        assert "content" not in details, "Clipboard content must NOT be captured!"

    # 9. Verify Event Telemetry Statistics API
    print("\n[Step 9] Verifying Telemetry Stats Endpoint (/api/v1/events/stats)...")
    status, stats = http_json("GET", "/events/stats", token=admin_token)
    assert status == 200, f"Failed to get stats: {status}"
    print(f"  --> Stats Summary:")
    print(f"      Total Events     : {stats.get('totalEvents')}")
    print(f"      Process Events   : {stats.get('processEvents')}")
    print(f"      USB Events       : {stats.get('usbEvents')}")
    print(f"      Clipboard Events : {stats.get('clipboardEvents')}")
    print(f"      Screen Recording : {stats.get('screenRecordingEvents')}")
    print(f"      Screen Sharing   : {stats.get('screenSharingEvents')}")

    # 10. Verify Endpoint Inspection Details with Monitoring Telemetry
    print(f"\n[Step 10] Verifying Endpoint Inspection (/api/v1/admin/devices/{device_id})...")
    status, dev_detail = http_json("GET", f"/admin/devices/{device_id}", token=admin_token)
    assert status == 200, f"Failed to get device detail: {status}"
    print(f"  --> Hostname             : {dev_detail.get('hostname')}")
    print(f"  --> Lifecycle Status     : {dev_detail.get('lifecycleStatus')}")
    print(f"  --> Connectivity Status  : {dev_detail.get('connectivityStatus')}")
    print(f"  --> Monitoring Status    : {dev_detail.get('monitoringStatus')}")
    print(f"  --> Process Monitor      : {dev_detail.get('processMonitorStatus')}")
    print(f"  --> USB Monitor          : {dev_detail.get('usbMonitorStatus')}")
    print(f"  --> Clipboard Monitor    : {dev_detail.get('clipboardMonitorStatus')}")
    print(f"  --> Screen Monitor       : {dev_detail.get('screenMonitorStatus')}")
    print(f"  --> Last Event Ingestion : {dev_detail.get('lastEventUploadAt')}")

    # 11. Verify Local Queue Bounded Overflow & Drop Counter
    print("\n[Step 11] Verifying Offline Queue Behavior and Bounded Drop Counter...")
    q = EventQueue(max_capacity=5)
    q.clear()
    for i in range(5):
        q.enqueue({"eventId": f"test-bounded-{i}", "eventType": "PROCESS_STARTED", "category": "PROCESS"})
    assert q.get_pending_count() == 5
    assert q.get_drop_count() == 0
    # Overfill
    q.enqueue({"eventId": "test-overflow-1", "eventType": "PROCESS_STARTED", "category": "PROCESS"})
    assert q.get_drop_count() == 1, "Drop counter must increment when queue capacity is exceeded!"
    print(f"  --> OK: Queue bounded capacity enforced (5 items held, 1 dropped)")
    q.clear()

    print("\n" + "=" * 70)
    print("  ALL SENTINELGUARD PHASE 3 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    main()
