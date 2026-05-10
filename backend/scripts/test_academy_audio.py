from __future__ import annotations

import os
import sys
from pathlib import Path

import requests


BASE_URL = os.environ.get("ACADEMY_TEST_BASE_URL", "http://localhost:8000").rstrip("/")


def fail(message: str) -> int:
    print(f"FAIL {message}")
    return 1


def main() -> int:
    print("ELEVENLABS_AUDIO_TEST_START")

    try:
        scenarios_response = requests.get(f"{BASE_URL}/academy/scenarios", timeout=15)
        if scenarios_response.status_code != 200:
            return fail(f"scenarios endpoint status={scenarios_response.status_code}")
        scenarios = scenarios_response.json()
        if not isinstance(scenarios, list) or not scenarios:
            return fail("scenarios response malformed or empty")
    except Exception as exc:
        return fail(f"failed to fetch scenarios error={exc}")

    selected = None
    for scenario in scenarios:
        languages = scenario.get("supported_languages") or []
        if "en" in languages:
            selected = scenario
            break
    if not selected:
        return fail("no english-supported scenario found")

    scenario_id = selected.get("scenario_id")
    if not scenario_id:
        return fail("selected scenario missing scenario_id")

    scenario_status = test_scenario_audio(scenario_id)
    feedback_status = test_feedback_audio()

    # PASS when endpoints succeed or gracefully return 503.
    if scenario_status in {"PASS", "GRACEFUL_UNAVAILABLE"} and feedback_status in {"PASS", "GRACEFUL_UNAVAILABLE"}:
        print("PASS audio tests completed")
        return 0
    return 1


def test_scenario_audio(scenario_id: str) -> str:
    body = {
        "scenario_id": scenario_id,
        "language": "en",
        "voice_mode": "scammer_simulation",
    }
    try:
        response = requests.post(f"{BASE_URL}/academy/audio/scenario", json=body, timeout=30)
    except Exception as exc:
        print(f"FAIL scenario audio request error={exc}")
        return "FAIL"

    print(f"SCENARIO_AUDIO_STATUS={response.status_code}")
    if response.status_code == 503:
        print("PASS audio gracefully unavailable")
        try:
            print(f"503 detail={response.json()}")
        except ValueError:
            print("503 detail=<non-json response>")
        return "GRACEFUL_UNAVAILABLE"

    if response.status_code != 200:
        print(f"FAIL scenario audio unexpected status={response.status_code}")
        return "FAIL"

    content_type = response.headers.get("content-type", "")
    if "audio/mpeg" not in content_type and "application/octet-stream" not in content_type:
        print(f"FAIL scenario audio invalid content-type={content_type}")
        return "FAIL"
    if len(response.content) <= 1000:
        print(f"FAIL scenario audio too small bytes={len(response.content)}")
        return "FAIL"

    Path("academy_test_scenario.mp3").write_bytes(response.content)
    print(f"PASS audio generated file=academy_test_scenario.mp3 bytes={len(response.content)}")
    return "PASS"


def test_feedback_audio() -> str:
    body = {
        "language": "en",
        "score": 80,
        "feedback": "Good job. You identified the main red flags.",
        "safe_action": "Hang up and verify through official channels.",
    }
    try:
        response = requests.post(f"{BASE_URL}/academy/audio/feedback", json=body, timeout=30)
    except Exception as exc:
        print(f"FAIL feedback audio request error={exc}")
        return "FAIL"

    print(f"FEEDBACK_AUDIO_STATUS={response.status_code}")
    if response.status_code == 503:
        print("PASS audio gracefully unavailable")
        try:
            print(f"503 detail={response.json()}")
        except ValueError:
            print("503 detail=<non-json response>")
        return "GRACEFUL_UNAVAILABLE"

    if response.status_code != 200:
        print(f"FAIL feedback audio unexpected status={response.status_code}")
        return "FAIL"

    content_type = response.headers.get("content-type", "")
    if "audio/mpeg" not in content_type and "application/octet-stream" not in content_type:
        print(f"FAIL feedback audio invalid content-type={content_type}")
        return "FAIL"
    if len(response.content) <= 1000:
        print(f"FAIL feedback audio too small bytes={len(response.content)}")
        return "FAIL"

    Path("academy_test_feedback.mp3").write_bytes(response.content)
    print(f"PASS audio generated file=academy_test_feedback.mp3 bytes={len(response.content)}")
    return "PASS"


if __name__ == "__main__":
    sys.exit(main())
