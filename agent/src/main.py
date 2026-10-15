"""
SentinelGuard Windows Endpoint Monitoring Agent CLI Entrypoint
Supported commands:
  python -m src.main enroll [--token <token>]
  python -m src.main start [--interval <seconds>]
  python -m src.main status
"""
import argparse
import sys

from . import config
from .credential_store import CredentialStore
from .enrollment import run_enrollment
from .heartbeat import run_heartbeat_loop


def cmd_enroll(args):
    success = run_enrollment(token=args.token)
    if not success:
        sys.exit(1)


def cmd_start(args):
    run_heartbeat_loop(interval=args.interval)


def cmd_status(args):
    store = CredentialStore()
    print("============================================================")
    print("  SentinelGuard Windows Agent — Endpoint Status")
    print("============================================================")

    if not store.is_enrolled():
        print("  Status         : NOT ENROLLED")
        print("  Enrollment     : Run 'python -m src.main enroll' to register")
    else:
        print("  Status         : ENROLLED")
        print(f"  Device Code    : {store.get_device_code()}")
        print(f"  Device ID      : {store.get_device_id()}")
        print(f"  Backend URL    : {config.BACKEND_URL}")
        last_hb = store.get_last_heartbeat() or "None recorded"
        print(f"  Last Heartbeat : {last_hb}")
        print("  Credential     : Protected at rest with Windows DPAPI")
        try:
            from .storage.event_queue import EventQueue
            q = EventQueue()
            print(f"  Buffered Queue : {q.get_pending_count()} pending events ({q.get_drop_count()} dropped)")
        except Exception:
            pass

    print(f"  Agent Version  : {config.AGENT_VERSION}")
    print("  Capabilities   : Process | USB | Clipboard | Screen App Detection")
    print("============================================================")


def main():
    parser = argparse.ArgumentParser(
        prog="python -m src.main",
        description="SentinelGuard Windows Endpoint Monitoring Agent"
    )
    subparsers = parser.add_subparsers(dest="command", help="Agent command to execute")

    # enroll command
    enroll_parser = subparsers.add_parser("enroll", help="Enroll this device using a one-time enrollment token")
    enroll_parser.add_argument("--token", "-t", type=str, default=None, help="One-time enrollment token")

    # start command
    start_parser = subparsers.add_parser("start", help="Start periodic heartbeat transmission")
    start_parser.add_argument("--interval", "-i", type=int, default=None, help="Heartbeat interval in seconds (default 30)")

    # status command
    subparsers.add_parser("status", help="Display local device enrollment and heartbeat status")

    args = parser.parse_args()

    if args.command == "enroll":
        cmd_enroll(args)
    elif args.command == "start":
        cmd_start(args)
    elif args.command == "status":
        cmd_status(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
