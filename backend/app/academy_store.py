import logging
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.mongo_store import mongo_store

try:
    from pymongo.errors import PyMongoError
except ImportError:  # pragma: no cover
    PyMongoError = Exception


logger = logging.getLogger("scamshield")


class AcademyStore:
    def __init__(self) -> None:
        self._memory_attempts: list[dict[str, Any]] = []
        self._mongo_attempts_collection = None
        self._mongo_ready = False

        if mongo_store.is_enabled() and mongo_store.is_connected() and getattr(mongo_store, "client", None):
            try:
                database = mongo_store.client[settings.MONGODB_DB]
                self._mongo_attempts_collection = database["academy_attempts"]
                self._mongo_attempts_collection.create_index("user_id")
                self._mongo_attempts_collection.create_index("scenario_id")
                self._mongo_attempts_collection.create_index("created_at")
                self._mongo_ready = True
            except PyMongoError as exc:
                logger.error("MONGO_ERROR message=%s", str(exc))
                self._mongo_attempts_collection = None
                self._mongo_ready = False

    def save_attempt(self, attempt: dict[str, Any]) -> None:
        payload = {**attempt, "created_at": datetime.now(timezone.utc)}
        if self._mongo_ready and self._mongo_attempts_collection is not None:
            try:
                self._mongo_attempts_collection.insert_one(payload)
                return
            except PyMongoError as exc:
                logger.error("MONGO_ERROR message=%s", str(exc))

        self._memory_attempts.append(payload)

    def get_attempts_by_user(self, user_id: str) -> list[dict[str, Any]]:
        attempts = self._get_all_attempts()
        return [attempt for attempt in attempts if attempt.get("user_id") == user_id]

    def build_stats(self, user_id: str) -> dict[str, Any]:
        attempts = self.get_attempts_by_user(user_id)
        if not attempts:
            return {
                "total_attempts": 0,
                "accuracy": 0.0,
                "average_score": 0,
                "weakest_scam_types": [],
                "most_missed_red_flags": [],
            }

        total_attempts = len(attempts)
        total_correct = sum(1 for attempt in attempts if attempt.get("correct_label"))
        average_score = round(sum(int(attempt.get("score", 0)) for attempt in attempts) / total_attempts)

        scores_by_type: dict[str, list[int]] = defaultdict(list)
        missed_flag_counts: Counter[str] = Counter()
        for attempt in attempts:
            scam_type = attempt.get("scam_type")
            if scam_type:
                scores_by_type[scam_type].append(int(attempt.get("score", 0)))
            for missed in attempt.get("missed_red_flags", []):
                missed_flag_counts[missed] += 1

        weakest_scam_types = [
            scam_type
            for scam_type, _ in sorted(
                ((scam_type, sum(scores) / len(scores)) for scam_type, scores in scores_by_type.items()),
                key=lambda item: item[1],
            )[:3]
        ]
        most_missed_red_flags = [phrase for phrase, _ in missed_flag_counts.most_common(5)]

        return {
            "total_attempts": total_attempts,
            "accuracy": round(total_correct / total_attempts, 2),
            "average_score": average_score,
            "weakest_scam_types": weakest_scam_types,
            "most_missed_red_flags": most_missed_red_flags,
        }

    def _get_all_attempts(self) -> list[dict[str, Any]]:
        attempts: list[dict[str, Any]] = []
        if self._mongo_ready and self._mongo_attempts_collection is not None:
            try:
                for row in self._mongo_attempts_collection.find({}, {"_id": 0}):
                    attempts.append(dict(row))
            except PyMongoError as exc:
                logger.error("MONGO_ERROR message=%s", str(exc))
        attempts.extend(self._memory_attempts)
        return attempts


academy_store = AcademyStore()
