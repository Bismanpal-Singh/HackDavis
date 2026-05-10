import logging
import re
from typing import Any


logger = logging.getLogger("scamshield")


class AcademyDatasetImporter:
    def __init__(self, dataset_name: str, max_scenarios: int, cache_dir: str) -> None:
        self.dataset_name = (dataset_name or "").strip()
        self.max_scenarios = max(0, max_scenarios)
        self.cache_dir = (cache_dir or "").strip() or ".cache/huggingface"

    def load_scenarios(self) -> list[dict]:
        logger.info("ACADEMY_DATASET_LOAD_START dataset=%s", self.dataset_name)
        if not self.dataset_name:
            logger.error("ACADEMY_DATASET_LOAD_FAILED reason=empty dataset name")
            return []

        try:
            from datasets import load_dataset
        except Exception as exc:  # pragma: no cover
            logger.error("ACADEMY_DATASET_LOAD_FAILED reason=%s", str(exc))
            return []

        try:
            rows = self._load_split_rows(load_dataset)
            scenarios: list[dict[str, Any]] = []
            for index, row in enumerate(rows):
                if self.max_scenarios and len(scenarios) >= self.max_scenarios:
                    break
                scenario = self._row_to_scenario(index + 1, row)
                if scenario is None:
                    continue
                scenarios.append(scenario)
                logger.info(
                    "ACADEMY_DATASET_ROW_CONVERTED scenario_id=%s label=%s",
                    scenario["scenario_id"],
                    scenario["label"],
                )

            logger.info("ACADEMY_DATASET_LOAD_SUCCESS count=%d", len(scenarios))
            return scenarios
        except Exception as exc:
            logger.error("ACADEMY_DATASET_LOAD_FAILED reason=%s", str(exc))
            return []

    def _load_split_rows(self, load_dataset_fn: Any) -> list[dict[str, Any]]:
        try:
            dataset_rows = load_dataset_fn(self.dataset_name, split="train", cache_dir=self.cache_dir)
            return [dict(row) for row in dataset_rows]
        except Exception:
            dataset_dict = load_dataset_fn(self.dataset_name, cache_dir=self.cache_dir)
            split_names = list(getattr(dataset_dict, "keys", lambda: [])())
            if not split_names:
                raise RuntimeError("No dataset split available.")
            first_split = split_names[0]
            return [dict(row) for row in dataset_dict[first_split]]

    def _row_to_scenario(self, index: int, row: dict[str, Any]) -> dict[str, Any] | None:
        dialogue = str(row.get("dialogue", "")).strip()
        raw_type = str(row.get("type", "")).strip() or "Unknown type"
        raw_label = row.get("label")

        if not dialogue:
            return None

        is_scam = self._is_scam_label(raw_label)
        label = "scam" if is_scam else "safe"
        scam_type = raw_type if is_scam else "Safe / legitimate call"
        transcript = self._split_dialogue(dialogue)
        red_flags = self._detect_red_flags(dialogue) if is_scam else []

        if is_scam and not red_flags:
            red_flags = [
                {
                    "phrase": "suspicious request",
                    "category": "general_scam_pattern",
                    "explanation": (
                        "This scenario is labeled as scam in the source dataset and contains suspicious "
                        "social-engineering behavior."
                    ),
                }
            ]

        scenario_id = f"hf_scam_dialogue_{index:04d}"
        title = f"Dataset Scenario: {raw_type}"
        safe_action = (
            "Stop the call and verify through official channels."
            if is_scam
            else "No action needed, but always verify through official channels if uncertain."
        )
        teaching_summary = (
            "This dataset scenario is labeled as a scam and may include social-engineering tactics such as "
            "pressure, impersonation, unusual payment requests, or sensitive information requests."
            if is_scam
            else "This dataset scenario is labeled as a non-scam conversation. Notice that it does not combine "
            "pressure, threats, secrecy, or unusual payment demands."
        )

        return {
            "scenario_id": scenario_id,
            "title": title,
            "scam_type": scam_type,
            "difficulty": "medium",
            "label": label,
            "supported_languages": ["en"],
            "language_versions": {
                "en": {
                    "title": title,
                    "transcript": transcript,
                    "red_flags": red_flags,
                    "safe_action": safe_action,
                    "teaching_summary": teaching_summary,
                }
            },
        }

    def _is_scam_label(self, raw_label: Any) -> bool:
        if isinstance(raw_label, bool):
            return raw_label
        if isinstance(raw_label, (int, float)):
            return int(raw_label) == 1
        normalized = str(raw_label).strip().lower()
        return normalized in {"1", "true", "scam", "yes"}

    def _split_dialogue(self, dialogue: str) -> list[str]:
        if "\n" in dialogue:
            lines = [line.strip() for line in dialogue.splitlines() if line.strip()]
            if lines:
                return lines

        chunks = re.split(r"(?<=[.!?])\s+", dialogue)
        normalized = [chunk.strip() for chunk in chunks if chunk.strip()]
        if normalized:
            return normalized
        return [dialogue.strip()]

    def _detect_red_flags(self, text: str) -> list[dict[str, str]]:
        lowered = text.lower()
        patterns = [
            (
                "urgency",
                ["immediately", "urgent", "right now", "act now"],
                "High-pressure timing can push victims into unsafe actions.",
            ),
            (
                "threat",
                ["arrest", "warrant", "legal action", "lawsuit", "police"],
                "Threat language is a common social-engineering tactic.",
            ),
            (
                "unusual payment request",
                ["gift card", "wire transfer", "bitcoin", "crypto", "zelle", "cash app"],
                "Unusual payment channels are frequently used in scams.",
            ),
            (
                "secrecy/isolation",
                ["do not hang up", "stay on the line", "do not tell anyone"],
                "Isolation language prevents independent verification.",
            ),
            (
                "verification code request",
                ["verification code", "otp", "security code"],
                "Requests for one-time codes can indicate account takeover attempts.",
            ),
            (
                "remote access request",
                ["anydesk", "teamviewer", "remote access"],
                "Remote access requests can hand device control to attackers.",
            ),
            (
                "impersonation",
                ["irs", "social security", "bank", "microsoft", "amazon", "government"],
                "Impersonating trusted institutions is a common scam tactic.",
            ),
        ]

        red_flags: list[dict[str, str]] = []
        for category, phrases, explanation in patterns:
            for phrase in phrases:
                if phrase in lowered:
                    red_flags.append(
                        {
                            "phrase": phrase,
                            "category": category,
                            "explanation": explanation,
                        }
                    )
                    break
        return red_flags
