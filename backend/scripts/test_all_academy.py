from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent


def run_script(script_name: str) -> tuple[bool, str]:
    script_path = SCRIPT_DIR / script_name
    proc = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    print(f"\n=== {script_name} ===")
    if proc.stdout.strip():
        print(proc.stdout.strip())
    if proc.stderr.strip():
        print(proc.stderr.strip())

    if script_name == "test_academy_audio.py":
        combined = f"{proc.stdout}\n{proc.stderr}"
        if proc.returncode == 0 and "PASS audio gracefully unavailable" in combined:
            return True, "GRACEFUL_UNAVAILABLE"
    if script_name == "test_academy_dataset.py":
        combined = f"{proc.stdout}\n{proc.stderr}"
        if proc.returncode == 0 and "INFO no public dataset scenarios found" in combined:
            return True, "INFO"

    return proc.returncode == 0, "PASS" if proc.returncode == 0 else "FAIL"


def main() -> int:
    flow_ok, flow_status = run_script("test_academy_flow.py")
    audio_ok, audio_status = run_script("test_academy_audio.py")
    dataset_ok, dataset_status = run_script("test_academy_dataset.py")

    print("\nACADEMY_TEST_SUMMARY")
    print(f"flow: {flow_status}")
    print(f"audio: {audio_status}")
    print(f"dataset: {dataset_status}")

    return 0 if (flow_ok and audio_ok and dataset_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
