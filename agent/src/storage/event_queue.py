"""
SentinelGuard Agent Local Persistent Event Queue
Provides a bounded, resilient local SQLite queue for buffering endpoint telemetry events.
Protects against data loss during network outages or backend downtime.
"""
import json
import logging
import sqlite3
import threading
import time
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from .. import config

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path(config.IDENTITY_DIR) / "event_queue.db"
MAX_QUEUE_CAPACITY = 10000


class EventQueue:

    def __init__(self, db_path: Optional[Path] = None, max_capacity: int = MAX_QUEUE_CAPACITY):
        self.db_path = db_path or DEFAULT_DB_PATH
        self.max_capacity = max_capacity
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), timeout=10.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS events (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            event_uuid TEXT UNIQUE NOT NULL,
                            payload_json TEXT NOT NULL,
                            created_at REAL NOT NULL,
                            attempts INTEGER DEFAULT 0
                        )
                    """)
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)")
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS queue_metrics (
                            metric_key TEXT PRIMARY KEY,
                            metric_value INTEGER NOT NULL
                        )
                    """)
                    # Initialize drop count if not present
                    conn.execute("""
                        INSERT OR IGNORE INTO queue_metrics (metric_key, metric_value)
                        VALUES ('dropped_events_count', 0)
                    """)
            finally:
                conn.close()

    def enqueue(self, event_dict: Dict[str, Any]) -> bool:
        """
        Enqueues an event. If the bounded capacity is reached, increments aggregate
        drop count and rejects or trims oldest events to avoid unbounded disk usage.
        """
        event_uuid = str(event_dict.get("eventId"))
        payload_json = json.dumps(event_dict)
        now = time.time()

        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    cursor = conn.execute("SELECT COUNT(*) FROM events")
                    current_count = cursor.fetchone()[0]

                    if current_count >= self.max_capacity:
                        # Increment aggregate dropped count
                        conn.execute("""
                            UPDATE queue_metrics
                            SET metric_value = metric_value + 1
                            WHERE metric_key = 'dropped_events_count'
                        """)
                        logger.warning(
                            "Event queue reached maximum capacity (%d). Dropping event %s.",
                            self.max_capacity, event_uuid
                        )
                        return False

                    conn.execute("""
                        INSERT OR IGNORE INTO events (event_uuid, payload_json, created_at, attempts)
                        VALUES (?, ?, ?, 0)
                    """, (event_uuid, payload_json, now))
                    return True
            except Exception as e:
                logger.error("Failed to enqueue event %s: %s", event_uuid, e)
                return False
            finally:
                conn.close()

    def peek_batch(self, batch_size: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves the oldest batch of events without deleting them.
        """
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.execute("""
                    SELECT event_uuid, payload_json
                    FROM events
                    ORDER BY created_at ASC
                    LIMIT ?
                """, (batch_size,))
                rows = cursor.fetchall()

                batch = []
                for row in rows:
                    try:
                        item = json.loads(row["payload_json"])
                        batch.append(item)
                    except Exception as e:
                        logger.error("Corrupted event JSON in queue for %s: %s", row["event_uuid"], e)
                return batch
            finally:
                conn.close()

    def delete_batch(self, event_uuids: List[str]) -> int:
        """
        Removes acknowledged events from the persistent queue.
        """
        if not event_uuids:
            return 0

        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    placeholders = ",".join("?" for _ in event_uuids)
                    cursor = conn.execute(
                        f"DELETE FROM events WHERE event_uuid IN ({placeholders})",
                        event_uuids
                    )
                    return cursor.rowcount
            finally:
                conn.close()

    def increment_attempts(self, event_uuids: List[str]) -> None:
        if not event_uuids:
            return
        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    placeholders = ",".join("?" for _ in event_uuids)
                    conn.execute(
                        f"UPDATE events SET attempts = attempts + 1 WHERE event_uuid IN ({placeholders})",
                        event_uuids
                    )
            finally:
                conn.close()

    def get_pending_count(self) -> int:
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.execute("SELECT COUNT(*) FROM events")
                return cursor.fetchone()[0]
            finally:
                conn.close()

    def get_drop_count(self) -> int:
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT metric_value FROM queue_metrics WHERE metric_key = 'dropped_events_count'"
                )
                row = cursor.fetchone()
                return row[0] if row else 0
            finally:
                conn.close()

    def clear(self) -> None:
        """Clears all queued events (used in tests)."""
        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    conn.execute("DELETE FROM events")
                    conn.execute("UPDATE queue_metrics SET metric_value = 0 WHERE metric_key = 'dropped_events_count'")
            finally:
                conn.close()
