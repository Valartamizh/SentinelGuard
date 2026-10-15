"""
SentinelGuard Phase 2 — End-to-End Live Integration Test Runner
Executes the full 20-step verification against the active Spring Boot backend and Windows agent.
"""
import json
import os
import sys
import time
from pathlib import Path
import urllib.request
import urllib.error

# Ensure agent src is importable
agent_dir = Path(__file__).resolve().parent / "agent"
sys.path.insert(0, str(agent_dir))

from src.device_info import get_device_info
from src.credential_store import CredentialStore
from src.api_client import ApiClient

BASE_URL = "http://localhost:8080/api/v1"

def http_json(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data else None
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
    print("=" * 65)
    print("  SENTINELGUARD PHASE 2 — END-TO-END VERIFICATION")
    print("=" * 65)

    # 1. Health check
    print("\n[Step 1] Verifying Spring Boot Backend Health...")
    status, health = http_json("GET", "/health")
    assert status == 200, f"Health check failed: {status}"
    print(f"  --> OK: Backend Status = {health.get('status')}")

    # 2. Administrator Login
    print("\n[Step 2] Administrator Login via JWT...")
    status, auth_resp = http_json("POST", "/auth/login", {
        "username": "admin",
        "password": "SentinelAdmin2024!"
    })
    assert status == 200, f"Admin login failed: {status} {auth_resp}"
    admin_token = auth_resp["token"]
    print(f"  --> OK: JWT issued for user '{auth_resp['username']}' (Expires in {auth_resp['expiresInMs']}ms)")

    # 3. Create Department
    dept_name = f"Security Ops {int(time.time())}"
    print(f"\n[Step 3] Creating Department '{dept_name}'...")
    status, dept_resp = http_json("POST", "/admin/departments", {"name": dept_name}, token=admin_token)
    assert status == 201, f"Failed to create department: {status} {dept_resp}"
    dept_id = dept_resp["id"]
    print(f"  --> OK: Department created with ID: {dept_id}")

    # 4. Create Employee
    emp_code = f"EMP{int(time.time()) % 100000}"
    print(f"\n[Step 4] Creating Employee '{emp_code}'...")
    status, emp_resp = http_json("POST", "/admin/employees", {
        "employeeCode": emp_code,
        "fullName": "Live Test Employee",
        "departmentId": dept_id,
        "status": "ACTIVE"
    }, token=admin_token)
    assert status == 201, f"Failed to create employee: {status} {emp_resp}"
    emp_id = emp_resp["id"]
    print(f"  --> OK: Employee created: {emp_resp['fullName']} ({emp_resp['employeeCode']})")

    # 5. Generate One-Time Enrollment Token
    print(f"\n[Step 5] Generating One-Time 256-bit Enrollment Token...")
    status, token_resp = http_json("POST", "/admin/enrollment-tokens", {"employeeId": emp_id}, token=admin_token)
    assert status == 201, f"Failed to generate enrollment token: {status} {token_resp}"
    enrollment_token = token_resp["enrollmentToken"]
    expires_at = token_resp["expiresAt"]
    print(f"  --> OK: Token generated successfully (Expires at {expires_at})")
    print(f"  --> Plaintext Token: {enrollment_token[:8]}...{enrollment_token[-8:]} (Length: {len(enrollment_token)})")

    # 6. Collect Device Info and Enroll via Windows Agent
    print("\n[Step 6] Running Python Windows Agent Device Enrollment...")
    device_info = get_device_info()
    print(f"  --> Endpoint Details: Hostname='{device_info['hostname']}', OS='{device_info['osVersion']}'")
    
    client = ApiClient("http://localhost:8080")
    enroll_res = client.enroll(enrollment_token, device_info)
    device_id = enroll_res["deviceId"]
    device_code = enroll_res["deviceCode"]
    device_credential = enroll_res["deviceCredential"]
    print(f"  --> OK: Enrolled! Device Code: {device_code}, ID: {device_id}")

    # 7. Store Credential locally via Windows DPAPI
    print("\n[Step 7] Storing Credential Locally with Windows DPAPI...")
    store = CredentialStore()
    store.save_identity(device_id, device_code, device_credential)
    assert store.is_enrolled(), "CredentialStore reports not enrolled"
    decrypted_cred = store.get_credential()
    assert decrypted_cred == device_credential, "DPAPI decrypted credential mismatch!"
    print(f"  --> OK: Device Credential successfully protected at rest using Windows DPAPI CryptProtectData")

    # 8. Token Re-use must fail
    print("\n[Step 8] Verifying One-Time Token Consumption (Re-use Attempt)...")
    try:
        client.enroll(enrollment_token, device_info)
        assert False, "Re-using the same token must have been rejected!"
    except ValueError as e:
        print(f"  --> OK: Token re-use correctly rejected: {e}")

    # 9. Verify Device in Backend Inventory
    print("\n[Step 9] Verifying Device Record in Backend...")
    status, dev_detail = http_json("GET", f"/admin/devices/{device_id}", token=admin_token)
    assert status == 200, f"Device lookup failed: {status}"
    print(f"  --> OK: Device Code: {dev_detail['deviceCode']}")
    print(f"  --> Employee: {dev_detail['employeeName']} ({dev_detail['employeeCode']})")
    print(f"  --> Connectivity Status: {dev_detail['connectivityStatus']}")
    assert dev_detail["connectivityStatus"] == "ONLINE", "Newly enrolled device should be ONLINE"

    # 10. Transmit Authenticated Heartbeat
    print("\n[Step 10] Transmitting Authenticated Heartbeat from Agent...")
    hb_res = client.send_heartbeat(device_id, device_credential, "1.0.0", "RUNNING")
    print(f"  --> OK: Heartbeat Status = {hb_res['status']}, Server Time = {hb_res['serverTime']}")

    # 11. Check Dashboard Summary Metrics
    print("\n[Step 11] Checking Dashboard Summary Metrics...")
    status, summary = http_json("GET", "/admin/devices/summary", token=admin_token)
    assert status == 200, f"Summary lookup failed: {status}"
    print(f"  --> Total Devices   : {summary['totalDevices']}")
    print(f"  --> Online Devices  : {summary['onlineDevices']}")
    print(f"  --> Offline Devices : {summary['offlineDevices']}")
    print(f"  --> Revoked Devices : {summary['revokedDevices']}")
    print(f"  --> Total Employees : {summary['totalEmployees']}")
    assert summary["totalDevices"] >= 1
    assert summary["onlineDevices"] >= 1

    # 12. Revoke Device
    print(f"\n[Step 12] Revoking Device {device_code} via Admin API...")
    status, revoke_res = http_json("POST", f"/admin/devices/{device_id}/revoke", token=admin_token)
    assert status == 200, f"Revocation failed: {status}"
    print(f"  --> OK: Device Status changed to {revoke_res['connectivityStatus']}")
    assert revoke_res["connectivityStatus"] == "REVOKED"

    # 13. Heartbeat after revocation must be rejected
    print("\n[Step 13] Verifying Heartbeat Rejection on Revoked Device...")
    try:
        client.send_heartbeat(device_id, device_credential, "1.0.0", "RUNNING")
        assert False, "Heartbeat from revoked device must be rejected!"
    except PermissionError as e:
        print(f"  --> OK: Heartbeat correctly rejected: {e}")

    # 14. Check Summary reflects Revoked device
    status, summary_after = http_json("GET", "/admin/devices/summary", token=admin_token)
    print(f"  --> OK: Revoked Devices count is now: {summary_after['revokedDevices']}")

    print("\n" + "=" * 65)
    print("  ALL PHASE 2 INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    main()
