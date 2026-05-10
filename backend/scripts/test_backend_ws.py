import asyncio
import json
import sys
import time
from pathlib import Path

import httpx
import websockets

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings


def get_test_host() -> str:
    if settings.HOST in {"0.0.0.0", "::"}:
        return "localhost"
    return settings.HOST


HOST = get_test_host()
PORT = settings.PORT
BASE_HTTP_URL = f"http://{HOST}:{PORT}"
BASE_WS_URL = f"ws://{HOST}:{PORT}"
WS_URL = f"{BASE_WS_URL}/detect"
REPORT_URL = f"{BASE_HTTP_URL}/report/{{session_id}}"
HEALTH_URL = f"{BASE_HTTP_URL}/health"
DEBUG_SESSIONS_URL = f"{BASE_HTTP_URL}/debug/sessions"

SCAM_TRANSCRIPT = [
    "Hello, this is an officer from the Social Security Administration.",
    "Your social security number has been suspended.",
    "There is a federal warrant under your name.",
    "Do not hang up.",
    "You need to pay immediately using gift cards.",
]

async def run_scam_transcript_test() -> str | None:
    print("\n=== Scam transcript pipeline test ===")
    session_id = None
    alert_seen = False
    start_time = time.time()

    async with websockets.connect(WS_URL) as websocket:
        for index, transcript in enumerate(SCAM_TRANSCRIPT):
            message = {
                "transcript": transcript,
                "timestamp": start_time + index,
            }

            print(f"\nSent: {transcript}")
            await websocket.send(json.dumps(message))

            raw_response = await websocket.recv()
            response = json.loads(raw_response)
            session_id = response["session_id"]

            print("Response:")
            print(json.dumps(response, indent=2))
            print(
                "Summary: "
                f"score={response['score']} "
                f"risk={response['risk_level']} "
                f"alert={response['alert']}"
            )

            if response.get("alert") is True:
                alert_seen = True
                print(f"ALERT became true for session_id={session_id}")

            if index < len(SCAM_TRANSCRIPT) - 1:
                await asyncio.sleep(1)

    print(f"\nSession ID: {session_id}")
    print(f"Alert seen: {alert_seen}")
    return session_id


def print_json_endpoint(label: str, url: str) -> None:
    print(f"\n{label}:")
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    print(json.dumps(response.json(), indent=2))


def print_report(session_id: str | None) -> None:
    if session_id is None:
        print("No session_id was returned; skipping report fetch.")
        return

    print_json_endpoint(
        f"Report for session_id={session_id}",
        REPORT_URL.format(session_id=session_id),
    )


async def main() -> None:
    print_json_endpoint("Health", HEALTH_URL)
    session_id = await run_scam_transcript_test()
    print_report(session_id)
    print_json_endpoint("Debug sessions", DEBUG_SESSIONS_URL)


if __name__ == "__main__":
    asyncio.run(main())
