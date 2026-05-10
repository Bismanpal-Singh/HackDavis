import logging
import re
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.decision_engine import dedupe_phrases, get_risk_level
from app.session_store import SessionState

try:
    from pymongo import DESCENDING, MongoClient
    from pymongo.errors import PyMongoError
except ImportError:  # pragma: no cover - keeps app importable before deps are installed.
    DESCENDING = -1
    MongoClient = None
    PyMongoError = Exception


logger = logging.getLogger("scamshield")


def _safe_error_message(exc: Exception) -> str:
    message = str(exc)
    if settings.MONGODB_URI:
        message = message.replace(settings.MONGODB_URI, "[MONGODB_URI_REDACTED]")
    return re.sub(r"mongodb(\+srv)?://[^@\s]+@", "mongodb://[CREDENTIALS_REDACTED]@", message)


class MongoStore:
    def __init__(self) -> None:
        self.client = None
        self.collection = None
        self._enabled = False
        self._connected = False

        if not settings.PERSIST_TO_MONGO:
            logger.info("Mongo persistence disabled")
            return

        if not settings.MONGODB_URI:
            logger.warning("MONGO_ERROR message=MONGODB_URI missing; Mongo persistence disabled")
            return

        if MongoClient is None:
            logger.warning("MONGO_ERROR message=pymongo not installed; Mongo persistence disabled")
            return

        try:
            self.client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
            self.client.admin.command("ping")
            database = self.client[settings.MONGODB_DB]
            self.collection = database[settings.MONGODB_COLLECTION]
            self.collection.create_index("session_id", unique=True)
            self.collection.create_index("updated_at")
            self.collection.create_index("dialed_phone")
            self.users_collection = database[settings.MONGODB_USERS_COLLECTION]
            self.users_collection.create_index("google_sub", unique=True)
            self._enabled = True
            self._connected = True
            logger.info("Mongo persistence enabled")
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            self.client = None
            self.collection = None
            self._enabled = False
            self._connected = False

    def is_enabled(self) -> bool:
        return self._enabled

    def is_connected(self) -> bool:
        return self._connected

    def create_session(self, session_state: SessionState) -> None:
        if not self.is_enabled():
            return

        try:
            self.collection.insert_one(self._session_to_document(session_state))
            logger.info("MONGO_SESSION_CREATED session_id=%s", session_state.session_id)
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))

    def update_session(self, session_state: SessionState) -> None:
        if not self.is_enabled():
            return

        try:
            session_state.updated_at = datetime.now(timezone.utc)
            self.collection.update_one(
                {"session_id": session_state.session_id},
                {"$set": self._session_to_document(session_state)},
                upsert=True,
            )
            logger.info("MONGO_SESSION_UPDATED session_id=%s", session_state.session_id)
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))

    def mark_session_ended(self, session_id: str) -> None:
        if not self.is_enabled():
            return

        try:
            self.collection.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "status": "ended",
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            logger.info("MONGO_SESSION_ENDED session_id=%s", session_id)
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))

    def get_session(self, session_id: str) -> dict | None:
        if not self.is_enabled():
            return None

        try:
            document = self.collection.find_one({"session_id": session_id})
            return self._clean_document(document) if document else None
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return None

    def list_recent_sessions(self, limit: int = 10) -> list[dict]:
        if not self.is_enabled():
            return []

        try:
            documents = (
                self.collection.find(
                    {},
                    {
                        "_id": 0,
                        "session_id": 1,
                        "caller_phone": 1,
                        "dialed_phone": 1,
                        "created_at": 1,
                        "current_score": 1,
                        "risk_level": 1,
                        "alert_triggered": 1,
                        "mock_claude": 1,
                    },
                )
                .sort("updated_at", DESCENDING)
                .limit(limit)
            )
            return [self._json_safe(document) for document in documents]
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return []

    def register_user(self, google_sub: str, dialed_phone: str) -> None:
        if not self.is_enabled():
            return
        try:
            self.users_collection.update_one(
                {"google_sub": google_sub},
                {
                    "$set": {"dialed_phone": dialed_phone, "updated_at": datetime.now(timezone.utc)},
                    "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
                },
                upsert=True,
            )
            logger.info("USER_REGISTERED google_sub=%s", google_sub)
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))

    def get_user_by_sub(self, google_sub: str) -> dict | None:
        if not self.is_enabled():
            return None
        try:
            user = self.users_collection.find_one({"google_sub": google_sub})
            return self._clean_document(user) if user else None
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return None

    def get_calls_by_dialed_phone(self, dialed_phone: str, limit: int = 100) -> list[dict]:
        if not self.is_enabled():
            return []
        try:
            documents = (
                self.collection.find(
                    {"dialed_phone": dialed_phone, "status": "ended"},
                    {"_id": 0},
                )
                .sort("updated_at", DESCENDING)
                .limit(limit)
            )
            return [self._json_safe(doc) for doc in documents]
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return []

    def _session_to_document(self, session: SessionState) -> dict:
        risk_level = get_risk_level(session.current_score)
        scores = [entry["score"] for entry in session.score_history]

        return {
            "session_id": session.session_id,
            "caller_phone": session.caller_phone,
            "dialed_phone": session.dialed_phone,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "status": session.status,
            "mock_claude": settings.MOCK_CLAUDE,
            "transcript_entries": [
                {"timestamp": entry.timestamp, "text": entry.text}
                for entry in session.transcript_entries
            ],
            "score_history": [
                {
                    "timestamp": entry["timestamp"],
                    "score": entry["score"],
                    "risk_level": entry.get("risk_level", get_risk_level(entry["score"])),
                }
                for entry in session.score_history
            ],
            "current_score": session.current_score,
            "max_score": max(scores, default=session.max_score),
            "risk_level": risk_level,
            "matched_categories": dedupe_phrases(session.matched_categories),
            "flagged_phrases": dedupe_phrases(session.flagged_phrases),
            "latest_claude_result": session.latest_claude_result,
            "alert_triggered": session.alert_triggered,
            "alert_triggered_at": session.alert_triggered_at,
        }

    def _clean_document(self, document: dict[str, Any]) -> dict:
        document.pop("_id", None)
        return self._json_safe(document)

    def _json_safe(self, value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, list):
            return [self._json_safe(item) for item in value]
        if isinstance(value, dict):
            return {key: self._json_safe(item) for key, item in value.items()}
        return value


mongo_store = MongoStore()
