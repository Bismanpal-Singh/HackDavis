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


def normalize_phone_lookup_values(phone: str | None) -> list[str]:
    if not phone:
        return []

    raw = phone.strip()
    digits = re.sub(r"\D", "", raw)
    values = [raw]

    if digits:
        values.append(digits)
        values.append(f"+{digits}")
        if len(digits) >= 10:
            last_10 = digits[-10:]
            values.append(last_10)
            values.append(f"+1{last_10}")

    deduped: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value and value not in seen:
            deduped.append(value)
            seen.add(value)
    return deduped


def phone_values_overlap(left: str | None, right: str | None) -> bool:
    if not left or not right:
        return False
    return bool(set(normalize_phone_lookup_values(left)) & set(normalize_phone_lookup_values(right)))


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
            self.users_collection.create_index("dialed_phone")
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

    def update_user_safelist(self, google_sub: str, phone_numbers: list[str]) -> bool:
        if not self.is_enabled():
            return False
        try:
            result = self.users_collection.update_one(
                {"google_sub": google_sub},
                {
                    "$set": {
                        "safe_list_phone_numbers": sorted(set(phone_numbers)),
                        "safe_list_updated_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            logger.info(
                "USER_SAFELIST_UPDATED google_sub=%s count=%d matched=%d",
                google_sub,
                len(set(phone_numbers)),
                result.matched_count,
            )
            return result.matched_count > 0
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return False

    def update_user_push_token(self, google_sub: str, platform: str, provider: str, token: str) -> bool:
        if not self.is_enabled():
            return False
        try:
            result = self.users_collection.update_one(
                {"google_sub": google_sub},
                {
                    "$set": {
                        "push_token": token,
                        "push_platform": platform,
                        "push_provider": provider,
                        "push_token_updated_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            logger.info(
                "USER_PUSH_TOKEN_UPDATED google_sub=%s platform=%s provider=%s matched=%d",
                google_sub,
                platform,
                provider,
                result.matched_count,
            )
            return result.matched_count > 0
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return False

    def get_user_by_sub(self, google_sub: str) -> dict | None:
        if not self.is_enabled():
            return None
        try:
            user = self.users_collection.find_one({"google_sub": google_sub})
            return self._clean_document(user) if user else None
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return None

    def get_user_by_dialed_phone(self, dialed_phone: str | None) -> dict | None:
        if not self.is_enabled():
            return None

        phone_values = normalize_phone_lookup_values(dialed_phone)
        if not phone_values:
            return None

        try:
            user = self.users_collection.find_one(
                {
                    "dialed_phone": {"$in": phone_values},
                    "push_token": {"$exists": True, "$ne": ""},
                }
            )
            return self._clean_document(user) if user else None
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return None

    def is_caller_in_user_safelist(self, dialed_phone: str | None, caller_phone: str | None) -> bool:
        if not self.is_enabled():
            return False

        phone_values = normalize_phone_lookup_values(dialed_phone)
        if not phone_values or not caller_phone:
            return False

        try:
            user = self.users_collection.find_one(
                {"dialed_phone": {"$in": phone_values}},
                {"_id": 0, "google_sub": 1, "safe_list_phone_numbers": 1},
            )
            if not user:
                return False

            safe_list_phone_numbers = user.get("safe_list_phone_numbers") or []
            is_safe = any(phone_values_overlap(stored_phone, caller_phone) for stored_phone in safe_list_phone_numbers)
            logger.info(
                "SAFE_LIST_LOOKUP dialed_phone=%s caller_phone=%s matched=%s safe_list_count=%d",
                dialed_phone,
                caller_phone,
                is_safe,
                len(safe_list_phone_numbers),
            )
            return is_safe
        except PyMongoError as exc:
            logger.error("MONGO_ERROR message=%s", _safe_error_message(exc))
            return False

    def get_calls_by_dialed_phone(self, dialed_phone: str, limit: int = 100) -> list[dict]:
        if not self.is_enabled():
            return []
        try:
            phone_values = normalize_phone_lookup_values(dialed_phone)
            documents = (
                self.collection.find(
                    {"dialed_phone": {"$in": phone_values}, "status": "ended"},
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
            "safe_caller_bypassed": session.safe_caller_bypassed,
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
            "is_scam": bool(session.latest_claude_result and session.latest_claude_result.get("is_scam")),
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
