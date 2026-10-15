# SentinelGuard — AI Behavioral Analysis Engine

> **Status: NOT IMPLEMENTED — Phase 4+**

## Purpose

The AI engine analyzes behavioral events from the backend database to detect
insider threats and anomalous user behavior.

## Planned Data Flow

```
Endpoint Events
      ↓
  Rule Engine                 ← Deterministic matching
      ↓
Individual Anomaly Detection  ← Per-user ML baselines
      ↓
Peer Anomaly Detection        ← Peer group comparisons
      ↓
  Risk Fusion                 ← Weighted risk score
      ↓
    Alerts                    ← Threshold notifications
```

## Planned Technology Stack

- **Python 3.11+**
- **FastAPI** — REST API for the backend to query risk scores
- **scikit-learn** — Isolation Forest, clustering algorithms
- **pandas / numpy** — Data processing
- **SQLAlchemy** — Database access
- **Celery** — Background task processing

## Getting Started (Phase 4+)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

## Directory Structure (Planned)

```
ai-engine/
├── src/
│   ├── main.py              # FastAPI entry point
│   ├── models/              # ML model definitions
│   ├── features/            # Feature engineering
│   ├── detectors/           # Anomaly detection algorithms
│   └── api/                 # REST endpoints
├── requirements.txt
└── README.md
```
