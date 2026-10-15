# SentinelGuard — Windows Endpoint Monitoring Agent

> **Status: Phase 2 Implemented** — Secure Enrollment, Windows DPAPI Credential Storage, and Authenticated Heartbeat Telemetry.

## Purpose

The SentinelGuard Windows Agent runs directly on monitored employee laptops running Windows. It collects non-sensitive endpoint telemetry, authenticates securely against the SentinelGuard Spring Boot backend, and maintains periodic heartbeats.

## Privacy & Security

- **Zero Surveillance in Phase 2**: The agent strictly collects non-sensitive OS metadata (Hostname, OS release, OS version, agent version).
- **DPAPI Credential Protection**: The device authentication credential issued by the server is encrypted using Windows Data Protection API (`CryptProtectData`) tied to the local user account. Plaintext credentials are **never** stored in files, logs, or source code.
- **Mutual Integrity**: Heartbeats are authenticated via Bearer token and validated against the registered device identity.

## Requirements

- Windows 10/11
- Python 3.12+ (tested with Python 3.13)
- Dependencies in `requirements.txt`: `requests`, `psutil`, `python-dotenv`

## Installation

```powershell
cd agent
python -m pip install -r requirements.txt
```

## Agent CLI Commands

### 1. Check Status
```powershell
python -m src.main status
```

### 2. Enroll Endpoint
Requires a one-time enrollment token generated from the SentinelGuard Administrator Dashboard:
```powershell
# Interactive prompt
python -m src.main enroll

# Or pass via flag:
python -m src.main enroll --token <one-time-token>
```

### 3. Start Heartbeat Service
Transmits heartbeats to the backend every 30 seconds with automatic exponential backoff retry on temporary disconnections:
```powershell
python -m src.main start

# Or custom interval:
python -m src.main start --interval 30
```
Stop gracefully at any time using `Ctrl+C`.

## Automated Unit Tests
```powershell
python -m unittest discover -s tests
```
