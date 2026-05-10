from __future__ import annotations

import os
import sys
from typing import Any

import requests


BASE_URL = os.environ.get("ACADEMY_TEST_BASE_URL", "http://localhost:8000").rstrip("/")


class FlowTester:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.selected_scenario: dict[str, Any] | None = None
        self.selected_detail_en: dict[str, Any] | None = None

    def pass_line(self, message: str) -> None:
        print(f"PASS {message}")

    def fail_line(self, message: str) -> None:
        print(f"FAIL {message}")
        self.failures.append(message)

    def info_line(self, message: str) -> None:
        print(f"INFO {message}")

    def run(self) -> int:
        print("ACADEMY_FLOW_TEST_START")
        self.test_health()
        self.test_scenarios_list()
        self.test_scenario_detail_en()
        self.test_language_behavior_hi()
        self.test_attempt_submit()
        self.test_stats()

        if self.failures:
            print("\nACADEMY_FLOW_TEST_RESULT=FAIL")
            for failure in self.failures:
                print(f"- {failure}")
            return 1
        print("\nACADEMY_FLOW_TEST_RESULT=PASS")
        return 0

    def _get_json(self, path: str) -> tuple[int, Any]:
        response = requests.get(f"{BASE_URL}{path}", timeout=15)
        try:
            payload = response.json()
        except ValueError:
            payload = None
        return response.status_code, payload

    def test_health(self) -> None:
        try:
            status, body = self._get_json("/health")
            if status != 200 or not isinstance(body, dict):
                self.fail_line(f"health endpoint failed status={status}")
                return
            self.pass_line("health endpoint reachable")
            self.info_line(f"backend reachable: true")
            if "elevenlabs_enabled" in body:
                self.info_line(f"elevenlabs_enabled={body['elevenlabs_enabled']}")
            if "elevenlabs_configured" in body:
                self.info_line(f"elevenlabs_configured={body['elevenlabs_configured']}")
            if "mongo_enabled" in body:
                self.info_line(f"mongo_enabled={body['mongo_enabled']}")
        except Exception as exc:
            self.fail_line(f"health endpoint exception={exc}")

    def test_scenarios_list(self) -> None:
        try:
            status, body = self._get_json("/academy/scenarios")
            if status != 200:
                self.fail_line(f"scenarios list status={status}")
                return
            if not isinstance(body, list):
                self.fail_line("scenarios response is not a list")
                return
            if not body:
                self.fail_line("scenarios list is empty")
                return

            required = ("scenario_id", "title", "difficulty", "label", "supported_languages")
            for idx, item in enumerate(body[:5]):
                missing = [key for key in required if key not in item]
                if missing:
                    self.fail_line(f"scenario index={idx} missing keys={missing}")
                    return

            self.selected_scenario = body[0]
            self.pass_line(f"scenarios loaded count={len(body)}")
            print("First 5 scenarios:")
            for item in body[:5]:
                print(
                    f"- {item.get('scenario_id')} | {item.get('title')} | "
                    f"label={item.get('label')} | langs={item.get('supported_languages')}"
                )
        except Exception as exc:
            self.fail_line(f"scenarios list exception={exc}")

    def test_scenario_detail_en(self) -> None:
        if not self.selected_scenario:
            self.fail_line("scenario detail skipped: no selected scenario")
            return
        scenario_id = self.selected_scenario["scenario_id"]
        try:
            status, body = self._get_json(f"/academy/scenarios/{scenario_id}?language=en")
            if status != 200 or not isinstance(body, dict):
                self.fail_line(f"scenario detail en failed status={status}")
                return

            checks = [
                (body.get("scenario_id") == scenario_id, "scenario_id mismatch"),
                (isinstance(body.get("transcript"), list) and len(body["transcript"]) > 0, "transcript missing"),
                (body.get("label") in {"scam", "safe"}, "invalid label"),
                (isinstance(body.get("red_flags"), list), "red_flags not list"),
                (bool(body.get("safe_action")), "safe_action missing"),
                (bool(body.get("teaching_summary")), "teaching_summary missing"),
            ]
            for ok, reason in checks:
                if not ok:
                    self.fail_line(f"scenario detail en validation failed: {reason}")
                    return

            self.selected_detail_en = body
            self.pass_line(f"scenario detail loaded scenario_id={scenario_id}")
        except Exception as exc:
            self.fail_line(f"scenario detail en exception={exc}")

    def test_language_behavior_hi(self) -> None:
        if not self.selected_scenario:
            self.fail_line("language test skipped: no selected scenario")
            return
        scenario_id = self.selected_scenario["scenario_id"]
        supported = self.selected_scenario.get("supported_languages") or []
        try:
            status, body = self._get_json(f"/academy/scenarios/{scenario_id}?language=hi")
            if status != 200 or not isinstance(body, dict):
                self.fail_line(f"scenario detail hi failed status={status}")
                return
            if not isinstance(body.get("transcript"), list) or not body["transcript"]:
                self.fail_line("scenario detail hi missing transcript")
                return

            if "hi" in supported:
                self.pass_line(f"scenario hi language loaded scenario_id={scenario_id}")
            else:
                fallback = body.get("language") == "en"
                fallback_flag = body.get("language_fallback") is True
                if not fallback:
                    self.fail_line("language fallback to en did not occur")
                    return
                if "language_fallback" in body and not fallback_flag:
                    self.fail_line("language_fallback field present but not true")
                    return
                self.pass_line(f"scenario language fallback worked scenario_id={scenario_id}")
        except Exception as exc:
            self.fail_line(f"scenario detail hi exception={exc}")

    def test_attempt_submit(self) -> None:
        if not self.selected_detail_en:
            self.fail_line("attempt test skipped: no scenario detail")
            return
        scenario = self.selected_detail_en
        real_flags = [flag.get("phrase", "") for flag in scenario.get("red_flags", []) if isinstance(flag, dict)]
        selected_red_flags = [phrase for phrase in real_flags[:2] if phrase]
        payload = {
            "scenario_id": scenario["scenario_id"],
            "language": "en",
            "user_label": scenario.get("label", "safe"),
            "selected_red_flags": selected_red_flags,
            "user_id": "test_user",
        }
        try:
            response = requests.post(f"{BASE_URL}/academy/attempt", json=payload, timeout=20)
            body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            if response.status_code != 200 or not isinstance(body, dict):
                self.fail_line(f"attempt submit failed status={response.status_code}")
                return

            required = [
                "score",
                "correct_label",
                "missed_red_flags",
                "incorrect_red_flags",
                "feedback",
                "safe_action",
            ]
            missing = [key for key in required if key not in body]
            if missing:
                self.fail_line(f"attempt response missing keys={missing}")
                return
            self.pass_line(f"attempt submitted score={body.get('score')}")
        except Exception as exc:
            self.fail_line(f"attempt submit exception={exc}")

    def test_stats(self) -> None:
        try:
            status, body = self._get_json("/academy/stats?user_id=test_user")
            if status != 200 or not isinstance(body, dict):
                self.fail_line(f"stats failed status={status}")
                return
            required = ["total_attempts", "accuracy", "average_score"]
            missing = [key for key in required if key not in body]
            if missing:
                self.fail_line(f"stats missing keys={missing}")
                return
            self.pass_line(f"stats fetched total_attempts={body.get('total_attempts')}")
        except Exception as exc:
            self.fail_line(f"stats exception={exc}")


if __name__ == "__main__":
    sys.exit(FlowTester().run())
