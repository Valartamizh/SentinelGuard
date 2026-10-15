# SentinelGuard
## AI-Powered Endpoint Security & Insider Threat Detection System

> **Final-Year Cybersecurity Project** — Monorepo

---

## Architecture Overview

```
Windows Agent (Python + DPAPI)  ──[Heartbeat (30s) / Bearer Auth]──▶  Spring Boot 3 Backend  ──▶  PostgreSQL 16
                                                                             │
                                                                   [JWT Admin Auth]
                                                                             ▼
                                                                  React + Vite Dashboard
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## Monorepo Structure

```
SentinelGuard/
├── agent/          # Python 3.12+ Windows endpoint monitoring agent (DPAPI protected)
├── backend/        # Java 21 Spring Boot 3 REST API (Spring Security, Flyway, JPA)
├── ai-engine/      # Python FastAPI + scikit-learn AI engine (Future phases)
├── dashboard/      # React + Vite + Tailwind CSS admin dashboard
├── docs/           # Project architectural and operational documentation
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── PHASE2_TESTING.md
│   └── AGENT_ENROLLMENT.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Project Foundation (PostgreSQL, Spring Boot skeleton, Health endpoint, React Shell) | ✅ Complete |
| **Phase 2** | Secure Employee/Device Enrollment, Windows DPAPI Credential Store, Authenticated Heartbeats, Enterprise UI/UX v2.0 Redesign | ✅ Complete |
| **Phase 3** | Real-Time Windows Endpoint Monitoring (Process, USB, Privacy Clipboard, Screen App Detection, Live SSE Dashboard) | ✅ Complete |
| **Phase 4** | AI Behavioral Threat Detection & Risk Scoring | ⏳ Upcoming |
| **Phase 5** | Incident Response, Alert Dashboard & Reporting | ⏳ Upcoming |

---

## Quick Start (Phase 2)

### 1. Start PostgreSQL (Docker)

```powershell
# From project root:
.\start-postgres.ps1
# Or directly:
docker compose up -d postgres
```

### 2. Start Backend (Spring Boot 3)

```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot"
$env:DB_PASSWORD = "SentinelGuard_Dev_2024!"
$env:JWT_SECRET = "U2VudGluZWxHdWFyZC1KV1QtU2VjcmV0LURldi0yMDI0LU11c3RDaGFuZ2VJblByb2R1Y3Rpb24hISE="
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "SentinelAdmin2024!"
.\mvnw.cmd spring-boot:run
```
- Swagger UI: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- Health check: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)

### 3. Start Frontend Dashboard

```powershell
cd dashboard
npm install
npm run dev
```
- Dashboard Console: [http://localhost:5173](http://localhost:5173)
- Default Admin Credentials: `admin` / `SentinelAdmin2024!`

### 4. Enroll & Run Windows Agent

```powershell
cd agent
python -m pip install -r requirements.txt

# 1. Check status
python -m src.main status

# 2. Enroll using token generated in the Admin Dashboard
python -m src.main enroll --token <one-time-token>

# 3. Start heartbeat service (sends heartbeats every 30s)
python -m src.main start
```

---

## Automated Verification Tests

- **Backend Integration Tests**:
  ```powershell
  cd backend
  .\mvnw.cmd test
  ```
- **Agent Unit Tests**:
  ```powershell
  cd agent
  python -m unittest discover -s tests
  ```
- **Phase 2 Full End-to-End Test**:
  ```powershell
  python test_e2e_phase2.py
  ```
- **Phase 3 Real-Time Telemetry End-to-End Test**:
  ```powershell
  python test_e2e_phase3.py
  ```

See [docs/PHASE3_MONITORING.md](docs/PHASE3_MONITORING.md) for detailed Phase 3 telemetry architecture, APIs, and privacy specifications.
