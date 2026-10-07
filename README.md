# SentinelGuard
## AI-Powered Endpoint Security & Insider Threat Detection System

> **Final-Year Cybersecurity Project** — Monorepo

---

## Architecture Overview

```
Windows Agent  →  Spring Boot Backend  →  PostgreSQL
                          ↓
                    AI Engine (future)
                          ↓
                  React Dashboard
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full planned architecture.

---

## Monorepo Structure

```
SentinelGuard/
├── agent/          # Python Windows endpoint monitoring agent
├── backend/        # Java 21 Spring Boot 3 REST API
├── ai-engine/      # Python FastAPI + scikit-learn AI engine
├── dashboard/      # React + Vite + Tailwind CSS admin dashboard
├── docs/           # Project documentation
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Quick Start (Phase 1)

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java | 21 | Eclipse Temurin recommended |
| Maven | 3.9+ | Bundled with IntelliJ or standalone |
| Node.js | 18+ | For the dashboard |
| Docker Desktop | Latest | For PostgreSQL |

### 1. Start PostgreSQL (Docker)

```bash
# From project root
docker compose up -d postgres
```

### 2. Start the Backend

```bash
cd backend
# Copy the environment template and fill in your values
copy .env.example .env

# Build and run
mvnw.cmd spring-boot:run
```

Backend runs at: http://localhost:8080  
Swagger UI: http://localhost:8080/swagger-ui.html

### 3. Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard runs at: http://localhost:5173

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ **Current** | Project foundation, health endpoint, DB setup, dashboard skeleton |
| 2 | 🔲 Planned | Windows agent data collection |
| 3 | 🔲 Planned | Backend event ingestion API |
| 4 | 🔲 Planned | AI behavioral analysis engine |
| 5 | 🔲 Planned | Full dashboard with alerts & risk scores |

---

## Health Check

```bash
curl http://localhost:8080/api/v1/health
```

Expected response:
```json
{
  "status": "UP",
  "service": "SentinelGuard Backend"
}
```
