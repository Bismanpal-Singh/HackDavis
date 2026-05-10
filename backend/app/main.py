import json
import logging

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.config import settings


logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("scamshield")

from app.decision_engine import DecisionEngine, get_risk_level
from app.detection_pipeline import process_transcript_chunk
from app.models import ErrorResponse, TranscriptChunk
from app.mongo_store import mongo_store
from app.report_builder import build_report, build_report_from_document
from app.rule_scorer import RuleScorer
from app.session_store import session_store
from app.twilio_stream import create_twilio_router


app = FastAPI(title=settings.APP_NAME)
rule_scorer = RuleScorer()
decision_engine = DecisionEngine()

app.include_router(create_twilio_router(rule_scorer, decision_engine))


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "mongo_enabled": mongo_store.is_enabled(),
        "mongo_connected": mongo_store.is_connected(),
        "mock_claude": settings.MOCK_CLAUDE,
        "twilio_configured": settings.TWILIO_CONFIGURED,
        "deepgram_configured": settings.DEEPGRAM_CONFIGURED,
        "public_base_url_set": bool((settings.PUBLIC_BASE_URL or "").strip()),
    }


@app.get("/debug/sessions")
async def debug_sessions() -> list[dict]:
    memory_summaries = [
        {
            "session_id": session.session_id,
            "created_at": session.created_at.isoformat(),
            "current_score": session.current_score,
            "risk_level": get_risk_level(session.current_score),
            "alert_triggered": session.alert_triggered,
            "mock_claude": settings.MOCK_CLAUDE,
        }
        for session in session_store.list_sessions()[-10:]
    ]
    if memory_summaries:
        return memory_summaries
    return mongo_store.list_recent_sessions(limit=10)


@app.get("/report/{session_id}")
async def get_report(session_id: str) -> dict:
    session = session_store.get_session(session_id)
    if session is not None:
        logger.info("REPORT_FETCHED_FROM_MEMORY session_id=%s", session_id)
        return build_report(session)

    document = mongo_store.get_session(session_id)
    if document is not None:
        logger.info("REPORT_FETCHED_FROM_MONGO session_id=%s", session_id)
        return build_report_from_document(document)

    logger.warning("REPORT_NOT_FOUND session_id=%s", session_id)
    raise HTTPException(status_code=404, detail="Session not found.")


@app.websocket("/detect")
async def detect(websocket: WebSocket) -> None:
    await websocket.accept()
    session = session_store.create_session()
    mongo_store.create_session(session)
    logger.info("WS_CONNECTED session_id=%s", session.session_id)

    try:
        while True:
            raw_message = await websocket.receive_text()

            try:
                payload = json.loads(raw_message)
                chunk = TranscriptChunk.model_validate(payload)
            except json.JSONDecodeError:
                logger.warning("Malformed JSON received: session_id=%s", session.session_id)
                await websocket.send_json(
                    ErrorResponse(error="invalid_json", detail="Message must be valid JSON.").model_dump()
                )
                continue
            except ValidationError as exc:
                logger.warning("Invalid payload received: session_id=%s detail=%s", session.session_id, exc)
                await websocket.send_json(
                    ErrorResponse(error="invalid_payload", detail="Expected transcript and timestamp fields.").model_dump()
                )
                continue

            if not chunk.transcript.strip():
                logger.info("Ignoring empty transcript chunk: session_id=%s", session.session_id)
                await websocket.send_json(
                    ErrorResponse(error="empty_transcript", detail="Transcript must not be empty.").model_dump()
                )
                continue

            logger.info(
                "TRANSCRIPT_RECEIVED session_id=%s text_length=%d timestamp=%s",
                session.session_id,
                len(chunk.transcript),
                chunk.timestamp,
            )
            response = process_transcript_chunk(
                session,
                chunk.transcript,
                rule_scorer=rule_scorer,
                decision_engine=decision_engine,
                timestamp=chunk.timestamp,
            )

            await websocket.send_json(response.model_dump())
    except WebSocketDisconnect:
        session.status = "ended"
        mongo_store.mark_session_ended(session.session_id)
        logger.info(
            "WS_DISCONNECTED session_id=%s transcript_entries=%d",
            session.session_id,
            len(session.transcript_entries),
        )

@app.on_event("startup")
async def startup_event() -> None:
    logger.info("ScamShield backend starting")
    logger.info("APP_ENV=%s", settings.APP_ENV)
    logger.info("LOG_LEVEL=%s", settings.LOG_LEVEL)
    logger.info("MOCK_CLAUDE=%s", str(settings.MOCK_CLAUDE).lower())
    logger.info("PERSIST_TO_MONGO=%s", str(settings.PERSIST_TO_MONGO).lower())
    logger.info("MONGO_CONFIGURED=%s", str(settings.MONGO_CONFIGURED).lower())
    logger.info("CLAUDE_CONFIGURED=%s", str(settings.CLAUDE_CONFIGURED).lower())
    logger.info("TWILIO_CONFIGURED=%s", str(settings.TWILIO_CONFIGURED).lower())
    logger.info("DEEPGRAM_CONFIGURED=%s", str(settings.DEEPGRAM_CONFIGURED).lower())
    logger.info("PUBLIC_BASE_URL set=%s", str(bool((settings.PUBLIC_BASE_URL or "").strip())).lower())
    logger.info("Mongo persistence %s", "enabled" if mongo_store.is_enabled() else "disabled")
    logger.info("Mock Claude %s", "enabled" if settings.MOCK_CLAUDE else "disabled")

    if not settings.MOCK_CLAUDE and not settings.ANTHROPIC_API_KEY:
        logger.warning(
            "ANTHROPIC_API_KEY missing while MOCK_CLAUDE=false. Claude calls will fallback safely."
        )

    if settings.PERSIST_TO_MONGO and not settings.MONGODB_URI:
        logger.warning("MONGODB_URI missing while PERSIST_TO_MONGO=true. Mongo persistence disabled.")
