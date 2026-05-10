"""Resolve public WSS URL for Twilio Media Streams (`<Stream url="...">`)."""

from __future__ import annotations

from urllib.parse import urlparse

from fastapi import Request

from app.config import settings


def resolve_media_stream_wss_url(request: Request) -> str:
    """Build `wss://host/twilio/media` for TwiML `<Stream>`."""
    raw = (settings.PUBLIC_BASE_URL or "").strip()
    if raw:
        if "://" not in raw:
            raw = f"https://{raw}"
        parsed = urlparse(raw)
        host = parsed.netloc or parsed.path.split("/")[0]
        if not host:
            host = raw.replace("https://", "").replace("http://", "").strip("/").split("/")[0]
        return f"wss://{host}/twilio/media"

    proto = request.headers.get("x-forwarded-proto", request.url.scheme or "https")
    scheme = "wss" if proto == "https" else "ws"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if not host:
        host = request.url.netloc
    return f"{scheme}://{host}/twilio/media"
