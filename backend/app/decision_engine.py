import logging
import time
from datetime import datetime, timezone

from app.claude_validator import ClaudeValidator
from app.config import settings
from app.models import RiskResponse, TranscriptChunk
from app.session_store import SessionState


logger = logging.getLogger("scamshield")


def clamp_score(score: int) -> int:
    return max(0, min(100, score))


def get_risk_level(score: int) -> str:
    if score >= settings.HARD_THRESHOLD:
        return "high"
    if score >= settings.SOFT_THRESHOLD:
        return "medium"
    return "low"


def dedupe_phrases(phrases: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()

    for phrase in phrases:
        if not phrase:
            continue
        phrase_key = phrase.casefold()
        if phrase_key not in seen:
            deduped.append(phrase)
            seen.add(phrase_key)

    return deduped


def should_trigger_alert(session: SessionState) -> bool:
    claude_result = session.latest_claude_result or {}
    return (
        session.current_score >= settings.HARD_THRESHOLD
        and claude_result.get("is_scam") is True
        and int(claude_result.get("confidence", 0)) >= settings.CLAUDE_CONFIDENCE_THRESHOLD
        and session.alert_triggered is False
    )


class DecisionEngine:
    def __init__(self, claude_validator: ClaudeValidator | None = None) -> None:
        self.claude_validator = claude_validator or ClaudeValidator()

    def process_chunk(
        self,
        session: SessionState,
        transcript_chunk: TranscriptChunk,
        rule_result: dict,
    ) -> RiskResponse:
        score_delta = int(rule_result.get("score_delta", 0))
        flagged_phrases = rule_result.get("flagged_phrases", [])
        matched_categories = rule_result.get("matched_categories", [])

        session.current_score = clamp_score(session.current_score + score_delta)
        session.max_score = max(session.max_score, session.current_score)
        session.score_history.append(
            {
                "timestamp": transcript_chunk.timestamp,
                "score": session.current_score,
                "score_delta": score_delta,
                "risk_level": get_risk_level(session.current_score),
            }
        )
        session.matched_categories = dedupe_phrases(
            [*session.matched_categories, *matched_categories]
        )
        session.flagged_phrases = dedupe_phrases(
            [*session.flagged_phrases, *flagged_phrases]
        )

        if session.current_score >= settings.SOFT_THRESHOLD and not session.soft_threshold_logged:
            session.soft_threshold_logged = True
            logger.info(
                "SOFT_THRESHOLD_CROSSED session_id=%s score=%d",
                session.session_id,
                session.current_score,
            )

        if session.current_score >= settings.HARD_THRESHOLD and not session.hard_threshold_logged:
            session.hard_threshold_logged = True
            logger.info(
                "HARD_THRESHOLD_CROSSED session_id=%s score=%d",
                session.session_id,
                session.current_score,
            )

        if self._should_validate_with_claude(session):
            context = session.get_recent_context(seconds=60)
            if settings.MOCK_CLAUDE:
                logger.info(
                    "CLAUDE_CALL_MOCK session_id=%s reason=MOCK_CLAUDE_ENABLED",
                    session.session_id,
                )
            else:
                logger.info("CLAUDE_CALL_REAL session_id=%s", session.session_id)
            claude_result = self.claude_validator.validate(
                current_chunk=transcript_chunk.transcript,
                context=context,
            )
            session.latest_claude_result = claude_result
            session.last_claude_call_time = time.time()
            logger.info(
                "CLAUDE_RESULT session_id=%s is_scam=%s confidence=%s scam_type=%s",
                session.session_id,
                claude_result.get("is_scam"),
                claude_result.get("confidence"),
                claude_result.get("scam_type"),
            )
            session.flagged_phrases = dedupe_phrases(
                [
                    *session.flagged_phrases,
                    *claude_result.get("flagged_phrases", []),
                ]
            )

        claude_result = session.latest_claude_result or {}
        alert = should_trigger_alert(session)
        if alert:
            session.alert_triggered = True
            session.alert_triggered_at = datetime.now(timezone.utc)
            logger.warning(
                "ALERT_TRIGGERED session_id=%s score=%d scam_type=%s",
                session.session_id,
                session.current_score,
                claude_result.get("scam_type"),
            )

        return RiskResponse(
            session_id=session.session_id,
            score=session.current_score,
            alert=alert,
            risk_level=get_risk_level(session.current_score),
            flagged_phrases=session.flagged_phrases,
            scam_type=claude_result.get("scam_type"),
            explanation=claude_result.get("explanation"),
            transcript=transcript_chunk.transcript,
        )

    def _should_validate_with_claude(self, session: SessionState) -> bool:
        if session.current_score < settings.SOFT_THRESHOLD:
            return False

        if session.last_claude_call_time is None:
            return True

        return (time.time() - session.last_claude_call_time) >= settings.CLAUDE_COOLDOWN_SECONDS
