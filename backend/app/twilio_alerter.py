"""Inject a voice warning into grandma's call leg when a scam is detected."""

from __future__ import annotations

import logging

from app.config import settings
from app.session_store import SessionState

logger = logging.getLogger("scamshield")

_WARNING_TEXT = (
    "Warning. ScamShield has detected a potential scam on this call. "
    "The caller may be attempting to defraud you. "
    "Please be cautious and hang up if you feel unsafe."
)


def inject_warning(session: SessionState) -> None:
    """Find grandma's child call leg and play a scam warning to her only.

    The parent call SID (session.session_id) is the scammer→Twilio leg.
    Twilio creates a child call SID for the Twilio→grandma leg when <Dial> fires.
    We update only that child leg with a <Say> TwiML so the scammer hears nothing.
    After the warning plays, grandma's leg ends — the scammer is left hanging.
    """
    if not settings.TWILIO_CONFIGURED:
        logger.warning("TWILIO_ALERT_SKIP reason=twilio_not_configured")
        return

    parent_sid = session.session_id
    if not parent_sid:
        logger.warning("TWILIO_ALERT_SKIP reason=no_session_id")
        return

    try:
        from twilio.rest import Client
        from twilio.twiml.voice_response import VoiceResponse

        client = Client(
            settings.TWILIO_API_KEY_SID,
            settings.TWILIO_API_KEY_SECRET,
            account_sid=settings.TWILIO_ACCOUNT_SID,
        )

        child_calls = client.calls.list(parent_call_sid=parent_sid, limit=5)
        if not child_calls:
            logger.warning(
                "TWILIO_ALERT_NO_CHILD_CALL parent_sid=%s", parent_sid
            )
            return

        grandmas_sid = child_calls[0].sid
        logger.info(
            "TWILIO_ALERT_INJECTING parent_sid=%s child_sid=%s",
            parent_sid,
            grandmas_sid,
        )

        vr = VoiceResponse()
        vr.say(_WARNING_TEXT, voice="Polly.Joanna")
        client.calls(grandmas_sid).update(twiml=str(vr))

        logger.warning(
            "TWILIO_ALERT_INJECTED child_sid=%s scam_type=%s",
            grandmas_sid,
            (session.latest_claude_result or {}).get("scam_type", "unknown"),
        )

    except Exception as exc:  # pylint: disable=broad-except
        logger.error("TWILIO_ALERT_FAILED parent_sid=%s err=%s", parent_sid, exc)
