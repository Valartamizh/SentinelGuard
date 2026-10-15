# Phase 3: Real-Time Windows Endpoint Activity Monitoring

## Overview

SentinelGuard Phase 3 delivers an authenticated, real-time endpoint telemetry pipeline that collects Windows security activity, transmits it securely to the Spring Boot backend, persists it in PostgreSQL with JSONB attributes, and visualizes it live on the SentinelGuard enterprise dashboard.

---

## 1. Architectural Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WINDOWS ENDPOINT AGENT                          │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │   Process Monitor    │  │     USB Monitor      │                    │
│  │ (Baseline+Lifecycle) │  │  (Removable Drives)  │                    │
│  └──────────┬───────────┘  └──────────┬───────────┘                    │
│             │                         │                                │
│  ┌──────────┴───────────┐  ┌──────────┴───────────┐                    │
│  │   Clipboard Monitor  │  │   Screen App Monitor │                    │
│  │ (Sequence No. Only)  │  │(Catalog-Based Pres.) │                    │
│  └──────────┬───────────┘  └──────────┬───────────┘                    │
│             │                         │                                │
│             └────────────┬────────────┘                                │
│                          ▼                                             │
│               EventManager Orchestrator                                │
│                          │                                             │
│                          ▼                                             │
│            EventQueue (SQLite Local Buffer)                            │
│           (Bounded 10k, Atomic Transactions)                           │
│                          │                                             │
│                          ▼                                             │
│            EventSender (Dedicated Worker)                              │
│         (Batching, Exponential Backoff, Non-blocking)                  │
└──────────────────────────┼─────────────────────────────────────────────┘
                           │ POST /api/v1/agent/events/batch
                           │ Bearer <device-credential>
                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SPRING BOOT 3 BACKEND                             │
│                                                                        │
│  AgentEventController ──▶ EventIngestionService                        │
│                                   │                                    │
│         ┌─────────────────────────┴─────────────────────────┐          │
│         ▼                                                   ▼          │
│  PostgreSQL 16                                   SseBroadcasterService │
│  (endpoint_events table, JSONB details)          (Live SSE Stream)     │
└─────────────────────────────────────────────────────────────┼──────────┘
                                                              │
                                      GET /api/v1/events/stream?token=<jwt>
                                                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     REACT ENTERPRISE DASHBOARD                         │
│                                                                        │
│  • Endpoint Activity Console (/activity)                               │
│  • Category Metric Cards (Total, Process, USB, Clipboard, Screen)      │
│  • Real-Time Live Stream Indicator (SSE Pulse Badge)                   │
│  • Multi-Filter Search & Structured Event Inspector                    │
│  • Device Monitoring Subsystem Health Telemetry Display                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Telemetry Categories & Privacy Guarantees

| Category | Event Types | Captured Metadata | Strict Privacy / Safety Guarantees |
|---|---|---|---|
| **PROCESS** | `PROCESS_STARTED`<br>`PROCESS_STOPPED` | Process name, PID, PPID, executable path, process create time | • Initial baseline established at launch (no false start floods)<br>• **Zero command-line collection** (prevents token/credential leakage)<br>• **Zero process memory / keystroke collection**<br>• PID reuse disambiguated using create time |
| **USB** | `USB_CONNECTED`<br>`USB_DISCONNECTED` | Device category, drive letter, volume name, file system | • Removable drive verification via `ctypes.windll.kernel32.GetDriveTypeW`<br>• **Zero file reading** or document content inspection<br>• State diff comparison prevents redundant notifications |
| **CLIPBOARD** | `CLIPBOARD_CHANGED` | Timestamp, format category (`TEXT`, `FILES`, `IMAGE`, `UNKNOWN`) | • Detected via `ctypes.windll.user32.GetClipboardSequenceNumber`<br>• **Zero copied text or passwords captured**<br>• **Zero content hashes calculated** (prevents rainbow table attacks)<br>• Non-interfering and passive |
| **SCREEN_RECORDING** | `APPLICATION_DETECTED`<br>`APPLICATION_EXITED` | Application name, process ID, `activeCaptureConfirmed: false` | • Detects OBS Studio, Bandicam, Camtasia, ShareX, Loom<br>• Explicitly marked as presence detection (`activeCaptureConfirmed: false`)<br>• **Zero screenshots, frames, or audio streams collected** |
| **SCREEN_SHARING** | `APPLICATION_DETECTED`<br>`APPLICATION_EXITED` | Application name, process ID, `activeCaptureConfirmed: false` | • Detects Microsoft Teams, Zoom, AnyDesk, TeamViewer, Google Chrome<br>• Explicitly unconfirmed activity state<br>• **Zero meeting content or screen streaming captured** |

---

## 3. Database Schema (`V3__endpoint_events.sql`)

### Table: `endpoint_events`

```sql
CREATE TABLE endpoint_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_uuid VARCHAR(64) NOT NULL UNIQUE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'INFO',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    source VARCHAR(64) NOT NULL DEFAULT 'WINDOWS_AGENT',
    details_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Alterations to `devices` Table:

```sql
ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS monitoring_status VARCHAR(32) DEFAULT 'OFFLINE',
    ADD COLUMN IF NOT EXISTS process_monitor_status VARCHAR(32) DEFAULT 'STOPPED',
    ADD COLUMN IF NOT EXISTS usb_monitor_status VARCHAR(32) DEFAULT 'STOPPED',
    ADD COLUMN IF NOT EXISTS clipboard_monitor_status VARCHAR(32) DEFAULT 'STOPPED',
    ADD COLUMN IF NOT EXISTS screen_monitor_status VARCHAR(32) DEFAULT 'STOPPED',
    ADD COLUMN IF NOT EXISTS queue_pending_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_event_upload_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS monitoring_errors TEXT;
```

---

## 4. REST & SSE APIs

### Agent Telemetry API
- `POST /api/v1/agent/events/batch`
  - **Auth**: `Authorization: Bearer <device-credential>`
  - Ingests batch of events (up to 200 items per request).
  - Verifies device is enrolled and not revoked.
  - Deduplicates events by `eventUuid`.
  - Updates device monitoring health state.
  - Broadcasts new events to active admin SSE streams.

### Administrator Query & Streaming APIs
- `GET /api/v1/events` (Paginated, sorted, multi-criteria filtering: `category`, `eventType`, `severity`, `deviceId`, `searchTerm`, `startTime`, `endTime`)
- `GET /api/v1/events/stats` (Aggregated total counts and category breakdown)
- `GET /api/v1/events/{id}` (Detailed event lookup)
- `GET /api/v1/devices/{deviceId}/events` (Device-specific paginated event log)
- `GET /api/v1/events/stream?token=<jwt>` (Server-Sent Events real-time broadcast)

---

## 5. Local Resilient Queue & Transport

The Windows agent uses an embedded SQLite database (`event_queue.db`) located in the agent's DPAPI-secured directory:
- **Capacity**: Bounded to 10,000 items. When full, older events are pruned and `dropped_events_count` is incremented.
- **Worker Thread**: `EventSender` runs as an independent daemon thread, batching events (50 per batch) and posting to `/api/v1/agent/events/batch`.
- **Fault Tolerance**: If the backend is unreachable, events remain securely staged locally with exponential backoff (5s up to 60s max).
- **Heartbeat Isolation**: The monitoring transport runs completely separate from `heartbeat.py`, ensuring heartbeats and health statuses remain operational during telemetry backpressure.

---

## 6. Verification and Testing

### 1. Automated Backend Tests
```powershell
cd backend
.\mvnw.cmd test
```
Result: **19/19 Tests Passed** (0 failures, 0 errors).

### 2. Automated Agent Tests
```powershell
cd agent
python -m unittest discover -s tests
```
Result: **16/16 Tests Passed** (0 failures, 0 errors).

### 3. Live End-to-End Test
```powershell
python test_e2e_phase3.py
```
Performs live Windows verification:
1. Verifies enrolled device credentials.
2. Starts `EventManager` with real monitors.
3. Spawns and kills `notepad.exe` (confirms `PROCESS_STARTED` and `PROCESS_STOPPED`).
4. Updates Windows clipboard via ctypes (confirms `CLIPBOARD_CHANGED`).
5. Transmits batch to backend `/api/v1/agent/events/batch`.
6. Queries backend stats `/api/v1/events/stats`.
7. Verifies JSONB persistence in PostgreSQL.
8. Verifies SSE stream `/api/v1/events/stream`.
