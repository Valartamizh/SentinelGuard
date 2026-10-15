"""
SentinelGuard Agent REST API Client
Handles HTTP communication with the backend server.
"""
import json
import logging
from typing import Dict, Any, Tuple, Optional
import requests

logger = logging.getLogger(__name__)


class ApiClient:

    def __init__(self, backend_url: str, timeout: int = 10):
        self.backend_url = backend_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()

    def enroll(self, enrollment_token: str, device_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submits one-time enrollment token to register the Windows laptop.
        Endpoint: POST /api/v1/agent/enroll
        """
        url = f"{self.backend_url}/api/v1/agent/enroll"
        payload = {
            "enrollmentToken": enrollment_token.strip(),
            "hostname": device_info.get("hostname"),
            "operatingSystem": device_info.get("operatingSystem"),
            "osVersion": device_info.get("osVersion"),
            "agentVersion": device_info.get("agentVersion")
        }

        response = self.session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=self.timeout
        )

        if response.status_code == 201:
            return response.json()
        elif response.status_code == 400:
            error_data = response.json() if response.headers.get("Content-Type", "").startswith("application/json") else {}
            detail = error_data.get("detail") or error_data.get("message") or "Invalid, expired, or already used enrollment token"
            raise ValueError(f"Enrollment rejected: {detail}")
        else:
            raise RuntimeError(f"Enrollment failed with HTTP status {response.status_code}: {response.text}")

    def send_heartbeat(
        self,
        device_id: str,
        credential: str,
        agent_version: str,
        status: str = "RUNNING",
        monitoring_status: Optional[str] = None,
        process_monitor_status: Optional[str] = None,
        usb_monitor_status: Optional[str] = None,
        clipboard_monitor_status: Optional[str] = None,
        screen_monitor_status: Optional[str] = None,
        queue_pending_count: Optional[int] = None,
        monitoring_errors: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends authenticated periodic heartbeat to backend.
        Endpoint: POST /api/v1/agent/heartbeat
        Header: Authorization: Bearer <device-credential>
        """
        url = f"{self.backend_url}/api/v1/agent/heartbeat"
        payload = {
            "deviceId": device_id,
            "agentVersion": agent_version,
            "status": status
        }
        if monitoring_status:
            payload["monitoringStatus"] = monitoring_status
        if process_monitor_status:
            payload["processMonitorStatus"] = process_monitor_status
        if usb_monitor_status:
            payload["usbMonitorStatus"] = usb_monitor_status
        if clipboard_monitor_status:
            payload["clipboardMonitorStatus"] = clipboard_monitor_status
        if screen_monitor_status:
            payload["screenMonitorStatus"] = screen_monitor_status
        if queue_pending_count is not None:
            payload["queuePendingCount"] = queue_pending_count
        if monitoring_errors:
            payload["monitoringErrors"] = monitoring_errors

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {credential}"
        }

        response = self.session.post(
            url,
            json=payload,
            headers=headers,
            timeout=self.timeout
        )

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            raise PermissionError("Heartbeat rejected: Device credential is invalid or device is not active")
        else:
            raise RuntimeError(f"Heartbeat failed with HTTP {response.status_code}: {response.text}")

    def send_event_batch(self, credential: str, batch_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transmits a batch of telemetry events to backend.
        Endpoint: POST /api/v1/agent/events/batch
        Header: Authorization: Bearer <device-credential>
        """
        url = f"{self.backend_url}/api/v1/agent/events/batch"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {credential}"
        }

        response = self.session.post(
            url,
            json=batch_payload,
            headers=headers,
            timeout=self.timeout
        )

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 409:
            return {"status": "SUCCESS", "processedCount": 0, "duplicateCount": len(batch_payload.get("events", []))}
        elif response.status_code == 401:
            raise PermissionError("Event batch rejected: Device credential is invalid or device is revoked")
        elif response.status_code == 400:
            error_data = response.json() if response.headers.get("Content-Type", "").startswith("application/json") else {}
            detail = error_data.get("detail") or error_data.get("message") or response.text
            raise ValueError(f"Event batch rejected by server: {detail}")
        else:
            raise RuntimeError(f"Event batch submission failed with HTTP {response.status_code}: {response.text}")
