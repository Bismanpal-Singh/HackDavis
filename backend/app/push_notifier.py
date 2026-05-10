"""Firebase Cloud Messaging push alerts for scam detections."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings
from app.decision_engine import get_risk_level
from app.mongo_store import mongo_store
from app.session_store import SessionState

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except ImportError:  # pragma: no cover - backend remains usable without Firebase deps.
    firebase_admin = None
    credentials = None
    messaging = None


logger = logging.getLogger("scamshield")


class PushNotifier:
    def __init__(self) -> None:
        self._initialized = False
        self._init_attempted = False

    def send_scam_alert(self, session: SessionState) -> bool:
        if not self._ensure_initialized():
            logger.warning("PUSH_SKIPPED reason=firebase_not_configured session_id=%s", session.session_id)
            return False

        user = mongo_store.get_user_by_dialed_phone(session.dialed_phone)
        if not user:
            logger.warning(
                "PUSH_SKIPPED reason=no_registered_device session_id=%s dialed_phone=%s",
                session.session_id,
                session.dialed_phone,
            )
            return False

        token = str(user.get("push_token") or "").strip()
        provider = str(user.get("push_provider") or "").strip()
        if not token or provider != "fcm":
            logger.warning(
                "PUSH_SKIPPED reason=missing_fcm_token session_id=%s provider=%s",
                session.session_id,
                provider or "none",
            )
            return False

        claude_result = session.latest_claude_result or {}
        try:
            message_id = messaging.send(
                messaging.Message(
                    token=token,
                    data={
                        "type": "scam_alert",
                        "title": "SCAM DETECTED",
                        "body": "Hang up now",
                        "session_id": session.session_id,
                        "score": str(session.current_score),
                        "risk_level": get_risk_level(session.current_score),
                        "scam_type": str(claude_result.get("scam_type") or ""),
                    },
                    android=messaging.AndroidConfig(
                        priority="high",
                    ),
                )
            )
            logger.warning(
                "PUSH_SENT session_id=%s google_sub=%s message_id=%s",
                session.session_id,
                user.get("google_sub"),
                message_id,
            )
            return True
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("PUSH_ERROR session_id=%s err=%s", session.session_id, exc)
            return False

    def _ensure_initialized(self) -> bool:
        if self._initialized:
            return True

        if self._init_attempted:
            return False

        self._init_attempted = True

        if firebase_admin is None or credentials is None:
            logger.warning("PUSH_INIT_SKIPPED reason=firebase_admin_missing")
            return False

        if firebase_admin._apps:  # pylint: disable=protected-access
            self._initialized = True
            return True

        try:
            credential = self._build_credential()
            if credential is None:
                logger.warning("PUSH_INIT_SKIPPED reason=firebase_credentials_missing")
                return False

            firebase_admin.initialize_app(credential)
            self._initialized = True
            logger.info("PUSH_INIT_OK")
            return True
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("PUSH_INIT_ERROR err=%s", exc)
            return False

    def _build_credential(self) -> Any | None:
        path = settings.resolved_firebase_credentials_path
        if path:
            return credentials.Certificate(path)

        return None


push_notifier = PushNotifier()
