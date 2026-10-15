"""
SentinelGuard Windows Agent Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

# Backend API server configuration
BACKEND_URL = os.getenv("SENTINEL_BACKEND_URL", "http://localhost:8080").rstrip("/")

# Agent telemetry settings
AGENT_VERSION = "1.0.0"
HEARTBEAT_INTERVAL_SECONDS = int(os.getenv("SENTINEL_HEARTBEAT_INTERVAL", "30"))

# Exponential backoff parameters
INITIAL_BACKOFF_SECONDS = 5
MAX_BACKOFF_SECONDS = 60
BACKOFF_FACTOR = 2

# Storage path for encrypted device identity
APPDATA_DIR = os.getenv("LOCALAPPDATA") or os.getenv("APPDATA") or str(Path.home())
IDENTITY_DIR = Path(APPDATA_DIR) / "SentinelGuard"
IDENTITY_FILE = IDENTITY_DIR / "device_identity.json"
