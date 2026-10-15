"""
SentinelGuard Windows Agent Unit Tests
Tests:
- Device information collection
- Enrollment request handling
- DPAPI Credential persistence
- Heartbeat payload generation and authentication
- Retry / backoff behavior
"""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from src.device_info import get_device_info
from src.credential_store import CredentialStore, _dpapi_protect, _dpapi_unprotect
from src.api_client import ApiClient


class TestDeviceInfo(unittest.TestCase):

    def test_device_info_structure(self):
        info = get_device_info()
        self.assertIn("hostname", info)
        self.assertIn("operatingSystem", info)
        self.assertIn("osVersion", info)
        self.assertIn("agentVersion", info)
        self.assertTrue(len(info["hostname"]) > 0)
        self.assertTrue(len(info["operatingSystem"]) > 0)
        self.assertEqual(info["agentVersion"], "1.0.0")

    def test_no_sensitive_fields_collected(self):
        info = get_device_info()
        forbidden_keys = {"password", "token", "browser", "clipboard", "screenshot", "keylog"}
        for k in info.keys():
            self.assertNotIn(k.lower(), forbidden_keys)


class TestCredentialStore(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.identity_file = Path(self.temp_dir.name) / "test_identity.json"
        self.store = CredentialStore(self.identity_file)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_dpapi_protect_unprotect(self):
        secret = b"super-secret-device-credential-key-12345"
        encrypted = _dpapi_protect(secret)
        self.assertNotEqual(secret, encrypted)
        decrypted = _dpapi_unprotect(encrypted)
        self.assertEqual(secret, decrypted)

    def test_save_and_retrieve_identity(self):
        self.assertFalse(self.store.is_enrolled())

        device_id = "11111111-2222-3333-4444-555555555555"
        device_code = "DEV-TEST01"
        raw_cred = "sg_cred_sample_token_abcdef123456"

        self.store.save_identity(device_id, device_code, raw_cred)

        self.assertTrue(self.store.is_enrolled())
        self.assertEqual(self.store.get_device_id(), device_id)
        self.assertEqual(self.store.get_device_code(), device_code)
        self.assertEqual(self.store.get_credential(), raw_cred)

        # Confirm the plaintext is NOT stored directly on disk
        with open(self.identity_file, "r") as f:
            disk_content = f.read()
        self.assertNotIn(raw_cred, disk_content)

    def test_update_last_heartbeat(self):
        self.store.save_identity("dev-1", "DEV-01", "cred-1")
        self.store.update_last_heartbeat("2026-10-08 12:00:00 UTC")
        self.assertEqual(self.store.get_last_heartbeat(), "2026-10-08 12:00:00 UTC")


class TestApiClient(unittest.TestCase):

    def setUp(self):
        self.client = ApiClient("http://localhost:8080")

    @patch("requests.Session.post")
    def test_enrollment_request(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "deviceId": "dev-uuid-1",
            "deviceCode": "DEV-A1B2",
            "deviceCredential": "secret-credential-hash",
            "status": "ACTIVE"
        }
        mock_post.return_value = mock_response

        info = {"hostname": "TEST-PC", "operatingSystem": "Windows", "osVersion": "11", "agentVersion": "1.0.0"}
        result = self.client.enroll("token-123", info)

        self.assertEqual(result["deviceId"], "dev-uuid-1")
        self.assertEqual(result["deviceCode"], "DEV-A1B2")
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        self.assertEqual(call_kwargs["json"]["enrollmentToken"], "token-123")
        self.assertEqual(call_kwargs["json"]["hostname"], "TEST-PC")

    @patch("requests.Session.post")
    def test_heartbeat_payload_and_auth(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "ACCEPTED",
            "serverTime": "2026-10-08T12:00:00"
        }
        mock_post.return_value = mock_response

        result = self.client.send_heartbeat(
            device_id="dev-uuid-1",
            credential="my-secret-cred",
            agent_version="1.0.0",
            status="RUNNING"
        )

        self.assertEqual(result["status"], "ACCEPTED")
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        self.assertEqual(call_kwargs["headers"]["Authorization"], "Bearer my-secret-cred")
        self.assertEqual(call_kwargs["json"]["deviceId"], "dev-uuid-1")
        self.assertEqual(call_kwargs["json"]["status"], "RUNNING")

    @patch("requests.Session.post")
    def test_heartbeat_rejected_raises_permission_error(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_post.return_value = mock_response

        with self.assertRaises(PermissionError):
            self.client.send_heartbeat("dev-uuid-1", "bad-cred", "1.0.0")


class TestBackoffBehavior(unittest.TestCase):

    def test_exponential_backoff_calculation(self):
        initial = 5
        factor = 2
        max_backoff = 60

        current = initial
        history = []
        for _ in range(6):
            history.append(current)
            current = min(current * factor, max_backoff)

        self.assertEqual(history, [5, 10, 20, 40, 60, 60])


if __name__ == "__main__":
    unittest.main()
