# SentinelGuard — Endpoint Enrollment & Heartbeat Protocol

This document outlines the security architecture, cryptographic protocol, and operational procedures for enrolling Windows endpoints into the SentinelGuard system.

---

## 1. Domain Relationships

```
┌─────────────────┐       1..*      ┌─────────────────┐       1..*      ┌─────────────────┐
│   Department    │ ─────────────── │    Employee     │ ─────────────── │     Device      │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
                                             │                                   │
                                             │ 1..*                              │ 1..*
                                             ▼                                   ▼
                                    ┌─────────────────┐                 ┌─────────────────┐
                                    │ EnrollmentToken │                 │ DeviceCredential│
                                    └─────────────────┘                 └─────────────────┘
```

- **Departments**: Organizational divisions (Engineering, Security Ops, Finance).
- **Employees**: Personnel records possessing a unique `employee_code` and lifecycle status (`ACTIVE`/`INACTIVE`).
- **Enrollment Tokens**: Short-lived, single-use cryptographically random tokens associated with an active employee.
- **Devices**: Enrolled hardware endpoints (bound to an employee) possessing a unique `device_code` and lifecycle status (`ACTIVE`/`REVOKED`/`RETIRED`).
- **Device Credentials**: Permanent cryptographic credentials used by the agent to authenticate heartbeats. Stored only as SHA-256 hashes on the server and encrypted via Windows DPAPI on the client.
- **Device Heartbeats**: Telemetry audit log storing arrival timestamps, reported agent versions, and system states.

---

## 2. Enrollment Token Lifecycle

1. **Generation**:
   - The security administrator selects an active employee in the dashboard.
   - The backend generates a 256-bit cryptographically secure random value via `SecureRandom`.
   - The SHA-256 hash is computed and persisted in `enrollment_tokens`.
   - The plaintext token is returned **strictly once** in the HTTP response.
   - Expiration timestamp is set to `NOW() + 15 minutes`.
2. **Consumption**:
   - The agent transmits the token along with basic host metadata (`POST /api/v1/agent/enroll`).
   - The backend locks the token record using a JPA pessimistic write lock (`SELECT ... FOR UPDATE`).
   - The backend validates:
     - Token exists.
     - Token is not expired (`expires_at > NOW()`).
     - Token has not been consumed (`used_at IS NULL`).
     - Token is not revoked (`revoked_at IS NULL`).
     - Associated employee is `ACTIVE`.
   - The token's `used_at` field is populated atomically.
   - A new device record and device credential are generated and bound to the employee.

---

## 3. Agent Credential Lifecycle & Local Storage

1. **Issuance**:
   - The backend generates a 256-bit secure device credential string (`CryptoUtil.generateSecureToken()`).
   - The server computes the SHA-256 hash and persists it in `device_credentials`. Plaintext is discarded immediately after sending the enrollment response.
2. **Client-Side DPAPI Protection**:
   - The Windows agent receives the plaintext credential over loopback/TLS.
   - It invokes Windows Data Protection API (`CryptProtectData`) with the flag `CRYPTPROTECT_UI_FORBIDDEN`.
   - The credential ciphertext is written to `%LOCALAPPDATA%\SentinelGuard\device_identity.json`.
   - The credential is decrypted in memory only when sending heartbeats using `CryptUnprotectData`.
   - Even if an unauthorized file read occurs, the ciphertext cannot be decrypted without the victim's Windows login session keys.
3. **Revocation**:
   - An administrator revokes the device via `POST /api/v1/admin/devices/{id}/revoke`.
   - The server marks `device.status = 'REVOKED'` and populates `device_credentials.revoked_at = NOW()`.
   - Any further heartbeats using that credential receive `HTTP 401 Unauthorized`.

---

## 4. Heartbeat Protocol

```
Agent                                                     Backend
  │                                                          │
  │  POST /api/v1/agent/heartbeat                            │
  │  Authorization: Bearer <device-credential>               │
  │  { "deviceId": "...", "agentVersion": "1.0.0", ... }     │
  ├─────────────────────────────────────────────────────────▶│
  │                                                          │ Validate credential hash
  │                                                          │ Validate device == deviceId
  │                                                          │ Validate device is ACTIVE
  │                                                          │ Update last_seen_at = NOW()
  │                                                          │ Insert into device_heartbeats
  │  HTTP 200 OK                                             │
  │  { "status": "ACCEPTED", "serverTime": "..." }           │
  │◀─────────────────────────────────────────────────────────┤
```

- **Interval**: Agent transmits every 30 seconds.
- **Failures**: On connection failure or network timeout, the agent implements exponential backoff (5s, 10s, 20s, 40s, max 60s).
- **Graceful Termination**: The agent listens for `SIGINT` (Ctrl+C) and stops cleanly without leaving dangling locks.

---

## 5. Online / Offline Status Calculation

In accordance with Phase 2 requirements, connectivity is never stored as a static column in the database. Instead, it is computed dynamically by comparing `devices.last_seen_at` against the authoritative server clock:

```java
if (device.getStatus() == DeviceStatus.REVOKED) {
    return "REVOKED";
}
if (device.getStatus() == DeviceStatus.RETIRED) {
    return "RETIRED";
}
if (device.getLastSeenAt() != null && device.getLastSeenAt().isAfter(now.minusSeconds(90))) {
    return "ONLINE";
}
return "OFFLINE";
```

- **Online Threshold**: 90 seconds (3 missed heartbeats).
- **Offline**: Any device that has not checked in within 90 seconds is displayed as `OFFLINE`.

---

## 6. Security Limitations (Phase 2)

1. **Localhost Development**: For Phase 2, services run on loopback (`http://localhost:8080`). Credentials must never be transmitted over plain HTTP across an untrusted network. Phase 3 will introduce TLS/HTTPS certificates before multi-machine deployment.
2. **Telemetry Scope**: Phase 2 restricts telemetry to health checks, OS versions, and heartbeat timestamps. No process monitoring, clipboard tracking, USB inspection, or file monitoring is performed until Phase 3.
3. **Windows Service**: The agent runs interactively in a user terminal during Phase 2. Background service daemonization and auto-start belong to subsequent phases.
