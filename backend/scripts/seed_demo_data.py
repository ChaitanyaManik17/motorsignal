"""Insert clearly labeled synthetic demo sessions, including a downward amplitude trend."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.storage import store
from app.demo_data import synthetic_sessions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile-id", default="demo-profile")
    args = parser.parse_args()
    store.clear_demo(args.profile_id)
    for session in synthetic_sessions(args.profile_id):
        store.insert(session)
    print(f"Inserted 12 synthetic tapping sessions for {args.profile_id}.")


if __name__ == "__main__":
    main()
