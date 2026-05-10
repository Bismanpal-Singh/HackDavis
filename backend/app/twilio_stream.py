"""Twilio Voice webhook + Media Streams WebSocket → Deepgram → detection pipeline."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from deepgram import DeepgramClient
from deepgram.clients.listen.enums import LiveTranscriptionEvents
from deepgram.clients.listen.v1.websocket.options import LiveOptions
from deepgram.clients.listen.v1.websocket.response import LiveResultResponse
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse

from app.config import settings
from app.decision_engine import DecisionEngine
from app.detection_pipeline import process_transcript_chunk
from app.mongo_store import mongo_store
from app.public_url import resolve_media_stream_wss_url
from app.rule_scorer import RuleScorer
from app.session_store import session_store

logger = logging.getLogger("scamshield")


def create_twilio_router(rule_scorer: RuleScorer, decision_engine: DecisionEngine) -> APIRouter:
    router = APIRouter(tags=["twilio"])

    def _twiml_voice_response(request: Request) -> str:
        wss_url = resolve_media_stream_wss_url(request)
        logger.info("TWILIO_TWIML_STREAM_URL url=%s", wss_url)
        vr = VoiceResponse()
        # <Connect><Stream> keeps the call leg open until the Media Stream ends.
        # <Start><Stream> is non-blocking; an empty Response after it often hangs up immediately.
        stream = vr.connect().stream(url=wss_url, track="inbound_track")
        stream.parameter(name="caller", value="twilio")
        return str(vr)

    @router.post("/twilio/voice")
    async def twilio_voice_post(request: Request) -> Response:
        if not settings.TWILIO_CONFIGURED:
            raise HTTPException(status_code=503, detail="Twilio credentials not configured.")
        body = _twiml_voice_response(request)
        return Response(content=body, media_type="text/xml")

    @router.get("/twilio/voice")
    async def twilio_voice_get(request: Request) -> Response:
        """Allow Console validation / redirects that use GET."""
        if not settings.TWILIO_CONFIGURED:
            raise HTTPException(status_code=503, detail="Twilio credentials not configured.")
        body = _twiml_voice_response(request)
        return Response(content=body, media_type="text/xml")

    @router.websocket("/twilio/media")
    async def twilio_media(websocket: WebSocket) -> None:
        await websocket.accept()
        if not settings.DEEPGRAM_CONFIGURED:
            logger.error("TWILIO_MEDIA_ABORT reason=deepgram_not_configured")
            await websocket.close(code=1011)
            return

        dg_client = DeepgramClient(settings.DEEPGRAM_API_KEY)
        dg_connection = dg_client.listen.asyncwebsocket.v("1")

        session = None
        call_sid: str | None = None
        stream_started = asyncio.Event()

        async def on_transcript(_conn: object, **kwargs: object) -> None:
            nonlocal session
            result = kwargs.get("result")
            if not isinstance(result, LiveResultResponse) or session is None:
                return
            if not result.is_final:
                return
            ch = result.channel
            if not ch.alternatives:
                return
            text = (ch.alternatives[0].transcript or "").strip()
            if not text:
                return
            logger.info(
                "DEEPGRAM_FINAL session_id=%s text_len=%d",
                session.session_id,
                len(text),
            )
            process_transcript_chunk(
                session,
                text,
                rule_scorer=rule_scorer,
                decision_engine=decision_engine,
            )

        dg_connection.on(LiveTranscriptionEvents.Transcript, on_transcript)

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    logger.warning("TWILIO_MEDIA_BAD_JSON")
                    continue

                event = msg.get("event")
                if event == "connected":
                    logger.info("TWILIO_MEDIA_CONNECTED")
                    continue

                if event == "start":
                    start = msg.get("start") or {}
                    call_sid = start.get("callSid") or msg.get("callSid")
                    if not call_sid:
                        logger.error("TWILIO_MEDIA_START_MISSING_CALL_SID")
                        break
                    session, created = session_store.get_or_create_by_id(call_sid)
                    if created:
                        mongo_store.create_session(session)
                    logger.info("TWILIO_MEDIA_START call_sid=%s session_id=%s", call_sid, session.session_id)

                    opts = LiveOptions(
                        model="nova-2",
                        encoding="mulaw",
                        sample_rate=8000,
                        channels=1,
                        interim_results=False,
                        punctuate=True,
                        endpointing="300",
                    )
                    ok = await dg_connection.start(opts)
                    if not ok:
                        logger.error("DEEPGRAM_START_FAILED call_sid=%s", call_sid)
                        break
                    stream_started.set()
                    continue

                if event == "media":
                    if not stream_started.is_set():
                        continue
                    media = msg.get("media") or {}
                    track = media.get("track", "inbound")
                    if track not in ("inbound", "inbound_track", None):
                        continue
                    payload_b64 = media.get("payload")
                    if not payload_b64:
                        continue
                    try:
                        audio = base64.b64decode(payload_b64)
                    except (ValueError, TypeError):
                        continue
                    await dg_connection.send(audio)
                    continue

                if event == "stop":
                    logger.info("TWILIO_MEDIA_STOP call_sid=%s", call_sid)
                    break

        except WebSocketDisconnect:
            logger.info("TWILIO_MEDIA_WS_DISCONNECT call_sid=%s", call_sid)
        finally:
            try:
                await dg_connection.finish()
            except Exception as exc:  # pylint: disable=broad-except
                logger.warning("DEEPGRAM_FINISH_ERROR err=%s", exc)
            if session is not None:
                session.status = "ended"
                mongo_store.mark_session_ended(session.session_id)
                logger.info(
                    "TWILIO_MEDIA_SESSION_ENDED session_id=%s entries=%d",
                    session.session_id,
                    len(session.transcript_entries),
                )

    return router
