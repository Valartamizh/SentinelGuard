# SentinelGuard — Phase 2 Testing & Verification Guide

This document records the automated tests, integration test suite, and step-by-step procedures to repeat the Phase 2 live demonstration.

---

## 1. Test Suite Summary

### A. Backend Automated Tests (JUnit 5 + MockMvc + SpringBootTest)
- Location: `backend/src/test/java/com/sentinelguard/EnrollmentAndHeartbeatTests.java`
- Database: Isolated H2 in PostgreSQL compatibility mode
- Test execution command:
  ```powershell
  cd backend ; .\mvnw.cmd test
  ```
- Executed Tests:
  1. `testEmployeeCreation`: Validates employee record persistence and department relation.
  2. `testDuplicateEmployeeCodeRejected`: Asserts HTTP 409 Conflict / duplicate code rejection.
  3. `testEnrollmentTokenExpiration`: Verifies that expired tokens cannot be consumed.
  4. `testOneTimeTokenConsumption`: Confirms that once consumed, a token cannot be reused.
  5. `testConcurrentEnrollment`: Spawns concurrent threads on the same token; validates that exactly 1 succeeds and all others fail atomically using pessimistic database locks.
  6. `testInvalidEnrollmentToken`: Rejects bogus / non-existent tokens.
  7. `testDeviceCredentialAuthentication`: Confirms Bearer auth with device credential accepts heartbeats.
  8. `testHeartbeatRejectedForRevokedDevice`: Asserts 401 Unauthorized when a device is revoked.
  9. `testDeviceIdMismatch`: Rejects heartbeat when credential device identity differs from payload device ID.
  10. `testOnlineOfflineCalculation`: Validates dynamic 90-second threshold calculations.
  11. `testUnauthorizedAdminAccess`: Confirms `/api/v1/admin/**` endpoints return 401 without JWT.
  12. `SentinelGuardApplicationTests`: Context load validation.
- **Result**: `12 tests run, 0 failures, 0 errors, 0 skipped` (BUILD SUCCESS).

### B. Python Windows Agent Tests (unittest)
- Location: `agent/tests/test_agent.py`
- Test execution command:
  ```powershell
  cd agent ; python -m unittest discover -s tests
  ```
- Executed Tests:
  1. `test_device_info_structure`: Validates collected hardware/OS metadata format.
  2. `test_no_sensitive_fields_collected`: Privacy verification (no passwords, history, screenshots, or clipboard data collected).
  3. `test_dpapi_protect_unprotect`: Confirms Windows DPAPI (`CryptProtectData` / `CryptUnprotectData`) encryption and decryption roundtrip.
  4. `test_save_and_retrieve_identity`: Asserts identity persistence and verifies plaintext credential is not stored in JSON.
  5. `test_update_last_heartbeat`: Asserts local heartbeat timestamp update.
  6. `test_enrollment_request`: Validates enrollment payload serialization and response handling.
  7. `test_heartbeat_payload_and_auth`: Validates `Authorization: Bearer <credential>` header and heartbeat payload.
  8. `test_heartbeat_rejected_raises_permission_error`: Validates HTTP 401 mapping to `PermissionError`.
  9. `test_exponential_backoff_calculation`: Tests backoff sequence progression (5s, 10s, 20s, 40s, 60s, 60s).
- **Result**: `9 tests run, 0 failures, 0 errors` (OK).

---

## 2. End-to-End Live Integration Verification

The complete 20-step integration verification can be executed at any time using:
```powershell
python test_e2e_phase2.py
```

### Verified Steps:
1. Health check: Spring Boot reports `UP`.
2. Administrator login: Validated against PostgreSQL `admin_users`, signed JWT returned.
3. Department creation: Created test department in PostgreSQL.
4. Employee creation: Created test employee assigned to department.
5. Enrollment token generation: Issued 256-bit cryptographically secure one-time token expiring in 15 minutes.
6. Endpoint information collection: Gathers Hostname (`ValarThamizh`), OS (`Windows 11`).
7. Windows Agent enrollment: Successfully enrolled device with backend; issued `deviceCode` and `deviceCredential`.
8. Windows DPAPI encryption: Credential encrypted at rest in local user directory.
9. Token reuse rejection: Attempt to enroll with same token rejected immediately.
10. Backend device verification: Retrieved device details via Admin API.
11. Authenticated heartbeat: Agent transmitted heartbeat with `Authorization: Bearer <credential>`; backend accepted with authoritative server time.
12. Online state check: Device dynamically evaluated as `ONLINE` (last seen < 90s).
13. Dashboard summary metrics: Verified counts reflect actual database rows (Total, Online, Revoked, Employees).
14. Device revocation: Administrator revoked endpoint; status transitioned to `REVOKED`.
15. Revocation enforcement: Subsequent heartbeat rejected with 401 Unauthorized.

---

## 3. How to Repeat the Live Demonstration in the Browser & Terminal

1. **Open Admin Dashboard**:
   - Navigate to `http://localhost:5173`
   - Log in with `admin` / `SentinelAdmin2024!`
2. **Add an Employee**:
   - Go to **Employees** tab in the sidebar
   - Click **New Employee**
   - Fill in Employee Code: `EMP-DEMO`, Name: `Demo User`, select Department
   - Click **Register Employee**
3. **Generate Enrollment Token**:
   - Go to **Enroll Device** tab
   - Select `EMP-DEMO` from the dropdown
   - Click **Issue Token**
   - Click **Copy** on the generated token
4. **Enroll Laptop in Terminal**:
   - Open PowerShell:
     ```powershell
     cd agent
     python -m src.main enroll --token <pasted-token>
     ```
   - Terminal confirms device enrolled with unique device code (e.g. `DEV-XXXXX`).
5. **Start Continuous Heartbeat Service**:
   - In terminal:
     ```powershell
     python -m src.main start
     ```
   - Terminal prints heartbeat check-in every 30 seconds with authoritative server time.
6. **Observe Real-Time Dashboard**:
   - In Dashboard under **Endpoints**, device displays with green pulsing **ONLINE** badge.
   - Click **Inspect** to view live telemetry history.
7. **Demonstrate Offline Threshold**:
   - Stop the agent using `Ctrl+C` in the terminal.
   - Wait 90 seconds.
   - The device status dynamically switches to amber **OFFLINE** badge without modifying database rows.
8. **Demonstrate Revocation**:
   - Click **Inspect** on the device, then click **Revoke Endpoint** and confirm.
   - Status changes to red **REVOKED**.
   - Restart the agent (`python -m src.main start`).
   - Terminal displays: `FAILED (Authentication Error: Heartbeat rejected: Device credential is invalid or device is not active)`.
