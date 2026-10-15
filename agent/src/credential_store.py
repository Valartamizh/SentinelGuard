"""
SentinelGuard Secure Credential Store
Protects the device authentication credential at rest using Windows DPAPI (CryptProtectData).
"""
import base64
import ctypes
from ctypes import wintypes
import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any

from . import config

logger = logging.getLogger(__name__)


# ── Windows DPAPI ctypes structures ─────────────────────────────
class DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_byte))
    ]


def _dpapi_protect(plaintext_bytes: bytes) -> bytes:
    """Encrypts byte string using Windows DPAPI CryptProtectData."""
    if not plaintext_bytes:
        return b""

    in_blob = DATA_BLOB(
        len(plaintext_bytes),
        ctypes.cast(ctypes.create_string_buffer(plaintext_bytes, len(plaintext_bytes)), ctypes.POINTER(ctypes.c_byte))
    )
    out_blob = DATA_BLOB()

    # CRYPTPROTECT_UI_FORBIDDEN = 0x01
    success = ctypes.windll.crypt32.CryptProtectData(
        ctypes.byref(in_blob),
        "SentinelGuard Device Credential",
        None,
        None,
        None,
        0x01,
        ctypes.byref(out_blob)
    )

    if not success:
        error_code = ctypes.windll.kernel32.GetLastError()
        raise RuntimeError(f"Windows DPAPI CryptProtectData failed with error code: {error_code}")

    try:
        buffer = (ctypes.c_byte * out_blob.cbData)()
        ctypes.memmove(buffer, out_blob.pbData, out_blob.cbData)
        return bytes(buffer)
    finally:
        ctypes.windll.kernel32.LocalFree(out_blob.pbData)


def _dpapi_unprotect(ciphertext_bytes: bytes) -> bytes:
    """Decrypts byte string using Windows DPAPI CryptUnprotectData."""
    if not ciphertext_bytes:
        return b""

    in_blob = DATA_BLOB(
        len(ciphertext_bytes),
        ctypes.cast(ctypes.create_string_buffer(ciphertext_bytes, len(ciphertext_bytes)), ctypes.POINTER(ctypes.c_byte))
    )
    out_blob = DATA_BLOB()

    # CRYPTPROTECT_UI_FORBIDDEN = 0x01
    success = ctypes.windll.crypt32.CryptUnprotectData(
        ctypes.byref(in_blob),
        None,
        None,
        None,
        None,
        0x01,
        ctypes.byref(out_blob)
    )

    if not success:
        error_code = ctypes.windll.kernel32.GetLastError()
        raise RuntimeError(f"Windows DPAPI CryptUnprotectData failed with error code: {error_code}")

    try:
        buffer = (ctypes.c_byte * out_blob.cbData)()
        ctypes.memmove(buffer, out_blob.pbData, out_blob.cbData)
        return bytes(buffer)
    finally:
        ctypes.windll.kernel32.LocalFree(out_blob.pbData)


class CredentialStore:
    """
    Manages local device identity.
    The credential is NEVER stored in plaintext. It is encrypted via DPAPI and
    saved in a protected user-specific local app data directory.
    """

    def __init__(self, identity_file: Optional[Path] = None):
        self.identity_file = identity_file or config.IDENTITY_FILE

    def is_enrolled(self) -> bool:
        """Returns True if a valid enrolled device identity exists."""
        if not self.identity_file.exists():
            return False
        try:
            data = self._read_file()
            return bool(data.get("deviceId") and data.get("encryptedCredential"))
        except Exception:
            return False

    def save_identity(self, device_id: str, device_code: str, plaintext_credential: str) -> None:
        """Encrypts credential using DPAPI and saves device identity to disk."""
        encrypted_bytes = _dpapi_protect(plaintext_credential.encode("utf-8"))
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode("ascii")

        data = {
            "deviceId": device_id,
            "deviceCode": device_code,
            "encryptedCredential": encrypted_b64,
            "backendUrl": config.BACKEND_URL
        }

        self.identity_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.identity_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        logger.info("Saved encrypted device identity to %s", self.identity_file)

    def get_device_id(self) -> Optional[str]:
        data = self._read_file()
        return data.get("deviceId")

    def get_device_code(self) -> Optional[str]:
        data = self._read_file()
        return data.get("deviceCode")

    def get_credential(self) -> Optional[str]:
        """Decrypts and returns device credential in memory."""
        data = self._read_file()
        encrypted_b64 = data.get("encryptedCredential")
        if not encrypted_b64:
            return None

        encrypted_bytes = base64.b64decode(encrypted_b64.encode("ascii"))
        decrypted_bytes = _dpapi_unprotect(encrypted_bytes)
        return decrypted_bytes.decode("utf-8")

    def update_last_heartbeat(self, timestamp_iso: str) -> None:
        """Updates the local timestamp of the last successful heartbeat."""
        try:
            data = self._read_file()
            data["lastHeartbeat"] = timestamp_iso
            with open(self.identity_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning("Could not update last heartbeat timestamp: %s", e)

    def get_last_heartbeat(self) -> Optional[str]:
        try:
            data = self._read_file()
            return data.get("lastHeartbeat")
        except Exception:
            return None

    def _read_file(self) -> Dict[str, Any]:
        if not self.identity_file.exists():
            return {}
        with open(self.identity_file, "r", encoding="utf-8") as f:
            return json.load(f)
