# SentinelGuard — System Architecture (Phase 2 Update)

## 1. System Overview

SentinelGuard is an AI-powered Endpoint Security & Insider Threat Detection system designed to monitor Windows endpoints, detect anomalous behavior, and compute real-time risk scores.

### Phase 2 Architecture

In Phase 2, SentinelGuard establishes a cryptographically secure endpoint enrollment and heartbeat verification pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                 Monitored Windows Endpoint                  │
│                                                             │
│   ┌────────────────────────┐    ┌────────────────────────┐  │
│   │    Python Windows      │    │     Windows DPAPI      │  │
│   │         Agent          │◄───┤  (CryptProtectData)    │  │
│   │  (device_info, client) │    │  Protected Credential  │  │
│   └───────────┬────────────┘    └────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │
                │ 1. POST /api/v1/agent/enroll (One-Time Token, 256-bit entropy)
                │ 2. POST /api/v1/agent/heartbeat (Bearer <device-credential>, every 30s)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Spring Boot 3 Backend Server                │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Security Layer:                                     │   │
│   │  - Device Credential Bearer Auth (SHA-256 Hashes)   │   │
│   │  - Admin JWT Filter & RBAC Authorization           │   │
│   │  - Centralized Exception Handling (RFC 7807)        │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │ Domain Services:                                    │   │
│   │  - EnrollmentTokenService (15-min atomic expiry)    │   │
│   │  - AgentService (Pessimistic token locking, auth)   │   │
│   │  - DeviceAdminService (Dynamic Online/Offline calc) │   │
│   │  - EmployeeService & DepartmentService              │   │
│   └──────────────────────────┬──────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌───────────────────────────────┐  ┌───────────────────────────┐
│     PostgreSQL 16 Database    │  │  React 19 + Vite Dashboard │
│                               │  │                           │
│  - admin_users (BCrypt)       │  │  - Admin JWT Session      │
│  - departments                │  │  - Real-time Devices Grid │
│  - employees                  │  │  - Employee Directory     │
│  - devices                    │  │  - One-time Token Issuer  │
│  - enrollment_tokens (SHA-256)│  │  - Live DB Summary Counts │
│  - device_credentials(SHA-256)│  └───────────────────────────┘
│  - device_heartbeats          │
└───────────────────────────────┘
```

---

## 2. Cryptographic and Security Specifications

### A. Enrollment Token Lifecycle
1. **Entropy**: Generated using `SecureRandom` with 32 bytes (256 bits) of cryptographic entropy formatted as a 64-character hex string.
2. **Storage**: Only the SHA-256 hex digest is stored in `enrollment_tokens.token_hash`. Plaintext is returned **strictly once** to the admin.
3. **Validity**: Tokens expire strictly 15 minutes after issuance.
4. **Atomic Consumption**: Tokens are retrieved and updated using JPA pessimistic write locks (`@Lock(LockModeType.PESSIMISTIC_WRITE)`). This ensures concurrent requests with the same token can never both succeed.
5. **Association**: The token is explicitly bound to a pre-existing active employee record.

### B. Device Authentication Credential Lifecycle
1. **Entropy**: Upon enrollment, the backend issues a 256-bit cryptographically secure credential string.
2. **Backend Persistence**: Stored as SHA-256 digest in `device_credentials.credential_hash`. The server never retains or logs plaintext credentials.
3. **Endpoint Protection**: On the Windows laptop, the agent protects the credential at rest using Windows DPAPI (`CryptProtectData`), ensuring it is tied to the Windows user context and never exposed in plaintext configuration files.
4. **Transport**: Transmitted on every heartbeat via HTTP header:
   `Authorization: Bearer <device-credential>`
5. **Revocation**: When an administrator revokes a device, all associated records in `device_credentials` have `revoked_at` populated immediately. All subsequent heartbeat requests are rejected with `401 Unauthorized`.

### C. Administrator Authentication
1. **Bootstrap**: On first launch, `AdminBootstrapRunner` detects an empty `admin_users` table and creates the initial admin with credentials specified in environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Passwords are hashed with BCrypt.
2. **JWT Sessions**: Administrators obtain signed HMAC-SHA384 JWT tokens with a 1-hour expiration. Endpoints under `/api/v1/admin/**` enforce `ROLE_ADMIN`.

---

## 3. Dynamic Online / Offline Calculation

Connectivity is calculated dynamically relative to the authoritative server clock:
- **Online**: Device lifecycle status is `ACTIVE` AND `last_seen_at > (now - 90 seconds)`.
- **Offline**: Device lifecycle status is `ACTIVE` AND `last_seen_at <= (now - 90 seconds)` or null.
- **Revoked / Retired**: Always displays their immutable lifecycle state (`REVOKED` or `RETIRED`).
