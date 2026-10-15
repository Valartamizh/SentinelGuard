"""
SentinelGuard Agent Enrollment Service
"""
import getpass
import sys
from typing import Optional

from . import config
from .api_client import ApiClient
from .credential_store import CredentialStore
from .device_info import get_device_info


def run_enrollment(token: Optional[str] = None) -> bool:
    """
    Enrolls the Windows laptop using a one-time enrollment token.
    Saves the returned device ID and encrypts the issued device credential with DPAPI.
    """
    store = CredentialStore()

    if store.is_enrolled():
        print(f"[!] Warning: This machine is already enrolled as Device Code: {store.get_device_code()}")
        confirm = input("Do you wish to re-enroll and overwrite the existing device identity? (y/N): ").strip().lower()
        if confirm != "y":
            print("Enrollment cancelled.")
            return False

    if not token:
        try:
            token = input("Enter SentinelGuard one-time enrollment token: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nEnrollment aborted by user.")
            return False

    if not token:
        print("[Error] Enrollment token cannot be empty.")
        return False

    print(f"[*] Contacting SentinelGuard server at {config.BACKEND_URL}...")
    device_info = get_device_info()
    print(f"[*] Endpoint details: {device_info['hostname']} ({device_info['osVersion']})")

    client = ApiClient(config.BACKEND_URL)
    try:
        result = client.enroll(token, device_info)
        device_id = result["deviceId"]
        device_code = result["deviceCode"]
        credential = result["deviceCredential"]

        # Encrypt and store credential securely with Windows DPAPI
        store.save_identity(device_id, device_code, credential)

        print("")
        print("============================================================")
        print("  [SUCCESS] Device Enrolled Successfully into SentinelGuard!")
        print("============================================================")
        print(f"  Device Code : {device_code}")
        print(f"  Device ID   : {device_id}")
        print(f"  Hostname    : {device_info['hostname']}")
        print(f"  Status      : {result.get('status', 'ACTIVE')}")
        print("  Credential  : Protected using Windows DPAPI encryption")
        print("============================================================")
        print("Next step: Start the monitoring heartbeat agent with:")
        print("  python -m src.main start")
        print("")
        return True

    except Exception as e:
        print(f"\n[ERROR] Enrollment failed: {e}")
        return False
