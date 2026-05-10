"""Twilio Voice webhook + Media Streams WebSocket → Deepgram → detection pipeline."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from urllib.parse import parse_qs

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


def _twilio_custom_params_to_dict(raw: object) -> dict[str, str]:
    """Normalize Twilio Media Stream ``customParameters`` (dict or list of name/value)."""
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return {str(k): "" if v is None else str(v) for k, v in raw.items()}
    if isinstance(raw, list):
        out: dict[str, str] = {}
        for item in raw:
            if isinstance(item, dict) and item.get("name") is not None:
                out[str(item["name"])] = str(item.get("value") or "")
        return out
    return {}


def _first_qs_value(qs: dict[str, list[str]], *keys: str) -> str:
    for key in keys:
        for variant in (key, key.lower(), key.upper()):
            vals = qs.get(variant)
            if vals and vals[0]:
                return vals[0].strip()
    return ""


def _fetch_call_phones_rest(call_sid: str) -> tuple[str | None, str | None]:
    """Load caller / dialed numbers from Twilio Calls API (works even if Stream params are empty)."""
    if not settings.TWILIO_CONFIGURED or not call_sid:
        return None, None
    try:
        from twilio.rest import Client

        client = Client(
            settings.TWILIO_API_KEY_SID,
            settings.TWILIO_API_KEY_SECRET,
            account_sid=settings.TWILIO_ACCOUNT_SID,
        )
        call = client.calls(call_sid).fetch()
        from_raw = getattr(call, "from_", None)
        to_raw = getattr(call, "to", None)
        from_s = (str(from_raw or "")).strip() or None
        to_s = (str(to_raw or "")).strip() or None
        return from_s, to_s
    except Exception as exc:  # pylint: disable=broad-except
        logger.warning("TWILIO_CALL_FETCH_FAILED call_sid=%s err=%s", call_sid, exc)
        return None, None


def create_twilio_router(rule_scorer: RuleScorer, decision_engine: DecisionEngine) -> APIRouter:
    router = APIRouter(tags=["twilio"])

    async def _twiml_voice_response(request: Request) -> str:
        wss_url = resolve_media_stream_wss_url(request)
        logger.info("TWILIO_TWIML_STREAM_URL url=%s", wss_url)
        caller_phone = ""
        dialed_phone = ""
        if request.method == "POST":
            body = await request.body()
            if body:
                qs = parse_qs(body.decode(errors="replace"), keep_blank_values=False)
                caller_phone = _first_qs_value(qs, "From", "Caller")
                dialed_phone = _first_qs_value(qs, "To", "Called")
        if not caller_phone:
            caller_phone = (
                request.query_params.get("From")
                or request.query_params.get("Caller")
                or ""
            ).strip()
        if not dialed_phone:
            dialed_phone = (
                request.query_params.get("To")
                or request.query_params.get("Called")
                or ""
            ).strip()
        logger.info(
            "TWILIO_VOICE_WEBHOOK has_caller=%s has_dialed=%s",
            bool(caller_phone),
            bool(dialed_phone),
        )

        vr = VoiceResponse()
        # <Connect><Stream> keeps the call leg open until the Media Stream ends.
        # <Start><Stream> is non-blocking; an empty Response after it often hangs up immediately.
        stream = vr.connect().stream(url=wss_url, track="inbound_track")
        # Passed through to Media Stream "start" customParameters for Mongo/reporting.
        stream.parameter(name="caller_phone", value=caller_phone or "")
        stream.parameter(name="dialed_phone", value=dialed_phone or "")
        return str(vr)

    @router.post("/twilio/voice")
    async def twilio_voice_post(request: Request) -> Response:
        if not settings.TWILIO_CONFIGURED:
            raise HTTPException(status_code=503, detail="Twilio credentials not configured.")
        body = await _twiml_voice_response(request)
        return Response(content=body, media_type="text/xml")

    @router.get("/twilio/voice")
    async def twilio_voice_get(request: Request) -> Response:
        """Allow Console validation / redirects that use GET."""
        if not settings.TWILIO_CONFIGURED:
            raise HTTPException(status_code=503, detail="Twilio credentials not configured.")
        body = await _twiml_voice_response(request)
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
                    params = _twilio_custom_params_to_dict(start.get("customParameters"))
                    caller_from_stream = (
                        params.get("caller_phone", "").strip()
                        or params.get("From", "").strip()
                    )
                    dialed_from_stream = (
                        params.get("dialed_phone", "").strip()
                        or params.get("To", "").strip()
                    )

                    if (not caller_from_stream or not dialed_from_stream) and settings.TWILIO_CONFIGURED:
                        api_from, api_to = await asyncio.to_thread(_fetch_call_phones_rest, call_sid)
                        if not caller_from_stream and api_from:
                            caller_from_stream = api_from
                        if not dialed_from_stream and api_to:
                            dialed_from_stream = api_to
                        if api_from or api_to:
                            logger.info("TWILIO_MEDIA_PHONES_FROM_API call_sid=%s", call_sid)

                    session, created = session_store.get_or_create_by_id(call_sid)
                    if caller_from_stream:
                        session.caller_phone = caller_from_stream
                    if dialed_from_stream:
                        session.dialed_phone = dialed_from_stream
                    if created:
                        mongo_store.create_session(session)
                    elif caller_from_stream or dialed_from_stream:
                        mongo_store.update_session(session)
                    logger.info(
                        "TWILIO_MEDIA_START call_sid=%s session_id=%s caller_set=%s dialed_set=%s",
                        call_sid,
                        session.session_id,
                        bool(session.caller_phone),
                        bool(session.dialed_phone),
                    )

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
