"""Shared transcript scoring path for WebSocket `/detect` and Twilio Media Streams."""

from __future__ import annotations

import logging
import time

from app.decision_engine import DecisionEngine
from app.models import RiskResponse, TranscriptChunk
from app.mongo_store import mongo_store
from app.rule_scorer import RuleScorer
from app.session_store import SessionState

logger = logging.getLogger("scamshield")


def process_transcript_chunk(
    session: SessionState,
    text: str,
    *,
    rule_scorer: RuleScorer,
    decision_engine: DecisionEngine,
    timestamp: float | None = None,
) -> RiskResponse:
    """Run rule scorer + decision engine for one transcript segment (same as `/detect`)."""
    ts = time.time() if timestamp is None else timestamp
    chunk = TranscriptChunk(transcript=text, timestamp=ts)
    session.add_transcript(text, ts)
    rule_result = rule_scorer.score_text(text)
    response = decision_engine.process_chunk(session, chunk, rule_result)
    logger.info(
        "RULE_SCORE session_id=%s score_delta=%d current_score=%d matched_categories=%s flagged_phrases=%s",
        session.session_id,
        rule_result["score_delta"],
        session.current_score,
        rule_result["matched_categories"],
        rule_result["flagged_phrases"],
    )
    logger.info(
        "DETECTION_RESPONSE session_id=%s score=%d risk_level=%s alert=%s",
        session.session_id,
        response.score,
        response.risk_level,
        response.alert,
    )
    mongo_store.update_session(session)
    return response
