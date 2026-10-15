"""
SentinelGuard Device Information Collector
Collects non-sensitive hardware and OS metadata for endpoint registration.
"""
import platform
import socket
from . import config


def get_device_info() -> dict:
    """
    Gathers non-sensitive system identifiers for registration:
    - Hostname
    - Operating system name
    - OS release and build version
    - SentinelGuard Agent version

    Strictly complies with cybersecurity privacy requirements:
    NO personal files, screenshots, clipboard data, or browser history are ever collected.
    """
    hostname = socket.gethostname()
    os_name = platform.system()
    os_release = platform.release()
    os_version = f"{os_name} {os_release} (Build {platform.version()})"

    return {
        "hostname": hostname,
        "operatingSystem": os_name,
        "osVersion": os_version,
        "agentVersion": config.AGENT_VERSION
    }
