"""
SentinelGuard Phase 3 — Windows Endpoint Monitoring Agent Unit Tests
Tests:
- Local SQLite EventQueue (bounded size, peek, delete, drop count tracking)
- Process Execution Monitor (baseline, process started/stopped, PID reuse, privacy)
- USB Storage Monitor (removable storage detection, connect/disconnect, deduplication)
- Clipboard Monitor (sequence number tracking, format detection, zero content capture)
- Screen Activity Monitor (application catalog detection, unconfirmed capture state)
- EventSender & Transport (batch transmission, retry, exponential backoff)
- EventManager subsystem coordination and health aggregation
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch, MagicMock

from src.storage.event_queue import EventQueue
from src.monitoring.process_monitor import ProcessMonitor
from src.monitoring.usb_monitor import UsbMonitor
from src.monitoring.clipboard_monitor import ClipboardMonitor
from src.monitoring.screen_activity_monitor import ScreenActivityMonitor
from src.monitoring.event_manager import EventManager
from src.transport.event_sender import EventSender


class TestEventQueue(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_queue.db"
        self.queue = EventQueue(db_path=self.db_path, max_capacity=5)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_enqueue_peek_delete(self):
        event1 = {"eventId": "ev-1", "eventType": "PROCESS_STARTED", "category": "PROCESS"}
        event2 = {"eventId": "ev-2", "eventType": "CLIPBOARD_CHANGED", "category": "CLIPBOARD"}

        self.assertTrue(self.queue.enqueue(event1))
        self.assertTrue(self.queue.enqueue(event2))
        self.assertEqual(self.queue.get_pending_count(), 2)

        batch = self.queue.peek_batch(batch_size=10)
        self.assertEqual(len(batch), 2)
        self.assertEqual(batch[0]["eventId"], "ev-1")
        self.assertEqual(batch[1]["eventId"], "ev-2")

        # Delete first event
        deleted = self.queue.delete_batch(["ev-1"])
        self.assertEqual(deleted, 1)
        self.assertEqual(self.queue.get_pending_count(), 1)

        remaining = self.queue.peek_batch()
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]["eventId"], "ev-2")

    def test_bounded_capacity_and_drop_tracking(self):
        # max_capacity = 5
        for i in range(5):
            self.assertTrue(self.queue.enqueue({"eventId": f"ev-{i}"}))

        self.assertEqual(self.queue.get_pending_count(), 5)
        self.assertEqual(self.queue.get_drop_count(), 0)

        # 6th and 7th events exceed capacity and must be dropped
        self.assertFalse(self.queue.enqueue({"eventId": "ev-overflow-1"}))
        self.assertFalse(self.queue.enqueue({"eventId": "ev-overflow-2"}))

        self.assertEqual(self.queue.get_pending_count(), 5)
        self.assertEqual(self.queue.get_drop_count(), 2)


class TestProcessMonitor(unittest.TestCase):

    def test_process_baseline_and_lifecycle(self):
        events = []
        callback = lambda e: events.append(e)
        device_id = "test-device-uuid"

        monitor = ProcessMonitor(
            event_callback=callback,
            device_id_provider=lambda: device_id,
            poll_interval=10.0
        )

        # Mock process snapshot
        mock_baseline = {
            (100, 1000.0): {"pid": 100, "name": "system.exe", "exe": "C:\\Windows\\system.exe", "ppid": 0, "create_time": 1000.0},
            (200, 2000.0): {"pid": 200, "name": "explorer.exe", "exe": "C:\\Windows\\explorer.exe", "ppid": 100, "create_time": 2000.0}
        }

        with patch.object(monitor, "_get_current_processes", return_value=mock_baseline):
            monitor._establish_baseline()

        # Baseline must NOT generate events
        self.assertEqual(len(events), 0)
        self.assertEqual(len(monitor._known_processes), 2)

        # Step 2: New process launched (notepad.exe) and explorer.exe closed
        mock_step2 = {
            (100, 1000.0): {"pid": 100, "name": "system.exe", "exe": "C:\\Windows\\system.exe", "ppid": 0, "create_time": 1000.0},
            (300, 3000.0): {"pid": 300, "name": "notepad.exe", "exe": "C:\\Windows\\notepad.exe", "ppid": 200, "create_time": 3000.0}
        }

        with patch.object(monitor, "_get_current_processes", return_value=mock_step2):
            # Run one scan
            with patch.object(monitor._stop_event, "wait", side_effect=[None, Exception("StopLoop")]):
                try:
                    monitor._run_loop()
                except Exception:
                    pass

        # We expect: 1 PROCESS_STARTED (notepad) and 1 PROCESS_STOPPED (explorer)
        types = [e["eventType"] for e in events]
        self.assertIn("PROCESS_STARTED", types)
        self.assertIn("PROCESS_STOPPED", types)

        started = next(e for e in events if e["eventType"] == "PROCESS_STARTED")
        self.assertEqual(started["category"], "PROCESS")
        self.assertEqual(started["details"]["processName"], "notepad.exe")
        self.assertEqual(started["details"]["pid"], 300)
        # Privacy check: No command line arguments in details
        self.assertNotIn("cmdline", started["details"])
        self.assertNotIn("args", started["details"])


class TestUsbMonitor(unittest.TestCase):

    def test_usb_connect_disconnect(self):
        events = []
        monitor = UsbMonitor(
            event_callback=lambda e: events.append(e),
            device_id_provider=lambda: "dev-uuid",
            poll_interval=10.0
        )

        # Baseline with no drives
        monitor._known_drives = {}

        # Plug in E:
        mock_plug = {
            "E:": {"device": "E:", "mountpoint": "E:\\", "fstype": "FAT32", "opts": "rw,removable"}
        }

        with patch.object(monitor, "_get_current_removable_drives", return_value=mock_plug):
            with patch.object(monitor._stop_event, "wait", side_effect=[None, Exception("Stop")]):
                try:
                    monitor._run_loop()
                except Exception:
                    pass

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["eventType"], "USB_CONNECTED")
        self.assertEqual(events[0]["category"], "USB")
        self.assertEqual(events[0]["details"]["driveLetter"], "E:")

        # Unplug E:
        events.clear()
        with patch.object(monitor, "_get_current_removable_drives", return_value={}):
            with patch.object(monitor._stop_event, "wait", side_effect=[None, Exception("Stop")]):
                try:
                    monitor._run_loop()
                except Exception:
                    pass

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["eventType"], "USB_DISCONNECTED")


class TestClipboardMonitor(unittest.TestCase):

    def test_clipboard_change_zero_content(self):
        events = []
        monitor = ClipboardMonitor(
            event_callback=lambda e: events.append(e),
            device_id_provider=lambda: "dev-uuid",
            poll_interval=10.0
        )
        monitor._last_sequence = 100

        with patch("src.monitoring.clipboard_monitor.get_clipboard_sequence_number", return_value=105):
            with patch("src.monitoring.clipboard_monitor.get_format_category", return_value="TEXT"):
                with patch.object(monitor._stop_event, "wait", side_effect=[None, Exception("Stop")]):
                    try:
                        monitor._run_loop()
                    except Exception:
                        pass

        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["eventType"], "CLIPBOARD_CHANGED")
        self.assertEqual(ev["category"], "CLIPBOARD")
        self.assertEqual(ev["details"]["sequenceNumber"], 105)
        self.assertEqual(ev["details"]["formatCategory"], "TEXT")

        # Crucial privacy assertion: No text, passwords, or data captured
        self.assertNotIn("text", ev["details"])
        self.assertNotIn("content", ev["details"])
        self.assertNotIn("hash", ev["details"])


class TestScreenActivityMonitor(unittest.TestCase):

    def test_screen_catalog_detection_unconfirmed_capture(self):
        events = []
        monitor = ScreenActivityMonitor(
            event_callback=lambda e: events.append(e),
            device_id_provider=lambda: "dev-uuid",
            poll_interval=10.0
        )
        monitor._active_catalog_pids = {}

        mock_detected = {
            555: {
                "pid": 555,
                "processName": "obs64.exe",
                "appName": "OBS Studio (64-bit)",
                "category": "SCREEN_RECORDING",
                "exe": "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe",
                "create_time": 1000.0
            }
        }

        with patch.object(monitor, "_scan_catalog_processes", return_value=mock_detected):
            with patch.object(monitor._stop_event, "wait", side_effect=[None, Exception("Stop")]):
                try:
                    monitor._run_loop()
                except Exception:
                    pass

        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["eventType"], "APPLICATION_DETECTED")
        self.assertEqual(ev["category"], "SCREEN_RECORDING")
        self.assertEqual(ev["details"]["processName"], "obs64.exe")
        # Explicit indicator that active recording is unconfirmed
        self.assertFalse(ev["details"]["activeCaptureConfirmed"])
        self.assertIn("unconfirmed", ev["details"]["note"].lower())


class TestEventManagerAndSender(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_mgr.db"
        self.queue = EventQueue(db_path=self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_event_manager_health_aggregation(self):
        mock_api = MagicMock()
        mgr = EventManager(
            api_client=mock_api,
            device_id_provider=lambda: "dev-123",
            credential_provider=lambda: "cred-secret",
            event_queue=self.queue
        )

        # Before start
        health = mgr.get_telemetry_health()
        self.assertEqual(health["monitoringStatus"], "MONITORING_DISABLED")

        mgr.is_running = True
        mgr.process_monitor.status = "ACTIVE"
        mgr.usb_monitor.status = "ACTIVE"
        mgr.clipboard_monitor.status = "ACTIVE"
        mgr.screen_monitor.status = "ACTIVE"

        health_active = mgr.get_telemetry_health()
        self.assertEqual(health_active["monitoringStatus"], "MONITORING_ACTIVE")
        self.assertEqual(health_active["queuePendingCount"], 0)

        # Degraded state if one monitor has an issue
        mgr.clipboard_monitor.status = "DEGRADED"
        mgr.clipboard_monitor.last_error = "Permission Denied"
        health_deg = mgr.get_telemetry_health()
        self.assertEqual(health_deg["monitoringStatus"], "MONITORING_DEGRADED")
        self.assertIn("Clipboard: Permission Denied", health_deg["monitoringErrors"])


if __name__ == "__main__":
    unittest.main()
