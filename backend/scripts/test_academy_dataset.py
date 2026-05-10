from __future__ import annotations

import os
import sys
from typing import Any

import requests


BASE_URL = os.environ.get("ACADEMY_TEST_BASE_URL", "http://localhost:8000").rstrip("/")


def is_public_dataset_scenario(scenario: dict[str, Any]) -> bool:
    scenario_id = str(scenario.get("scenario_id", ""))
    if scenario.get("source") == "huggingface":
        return True
    if scenario.get("source_dataset"):
        return True
    return scenario_id.startswith("hf_")


def fail(message: str) -> int:
    print(f"FAIL {message}")
    return 1


def main() -> int:
    try:
        response = requests.get(f"{BASE_URL}/academy/scenarios", timeout=15)
    except Exception as exc:
        return fail(f"scenarios endpoint exception={exc}")

    if response.status_code != 200:
        return fail(f"scenarios endpoint status={response.status_code}")

    try:
        scenarios = response.json()
    except ValueError:
        return fail("scenarios response was not valid JSON")

    if not isinstance(scenarios, list):
        return fail("scenarios response is not a list")

    public_dataset = [scenario for scenario in scenarios if is_public_dataset_scenario(scenario)]
    seeded = [scenario for scenario in scenarios if not is_public_dataset_scenario(scenario)]

    print(f"TOTAL_SCENARIOS={len(scenarios)}")
    print(f"SEEDED_SCENARIOS={len(seeded)}")
    print(f"PUBLIC_DATASET_SCENARIOS={len(public_dataset)}")

    if not public_dataset:
        print("INFO no public dataset scenarios found")
        print("This is okay if ACADEMY_USE_HF_DATASET=false or dataset failed to load.")
        return 0

    print("PASS public dataset scenarios loaded")
    sample = public_dataset[0]
    scenario_id = sample.get("scenario_id")
    if not scenario_id:
        return fail("public dataset scenario missing scenario_id")

    detail_response = requests.get(
        f"{BASE_URL}/academy/scenarios/{scenario_id}?language=en",
        timeout=15,
    )
    if detail_response.status_code != 200:
        return fail(f"public dataset detail status={detail_response.status_code}")
    detail = detail_response.json()

    if not isinstance(detail.get("transcript"), list) or not detail["transcript"]:
        return fail("public dataset detail missing transcript")
    if detail.get("label") not in {"scam", "safe"}:
        return fail(f"public dataset detail invalid label={detail.get('label')}")
    if not isinstance(detail.get("red_flags"), list):
        return fail("public dataset detail red_flags is not list")

    print(f"PASS public dataset detail valid scenario_id={scenario_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
