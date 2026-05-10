# ScamShield Backend

ScamShield is a backend-only FastAPI service for hackathon scam-call detection. It receives transcript chunks over WebSocket, scores scam risk with rule-based detection, optionally validates suspicious sessions with Claude or deterministic mock Claude, fires a one-time alert, persists session/report data to MongoDB Atlas when enabled, and exposes report/debug endpoints.

**Twilio inbound voice:** Configure your Twilio number’s **A call comes in** webhook to `POST https://<PUBLIC_BASE_URL>/twilio/voice` (HTTPS). Twilio loads TwiML that starts a Media Stream to `wss://<same-host>/twilio/media`. Audio is transcribed with Deepgram (streaming), then each finalized phrase runs the same detection path as WebSocket `/detect`. Raw audio is not persisted.

This repo does not ship a frontend or authentication; ElevenLabs/SMS are out of scope unless you add them.

## Structure

```text
backend/
  app/
    main.py
    config.py
    models.py
    session_store.py
    rule_scorer.py
    claude_validator.py
    decision_engine.py
    report_builder.py
    mongo_store.py
    academy_scenarios.py
    academy_store.py
    academy_routes.py
    elevenlabs_tts.py
    detection_pipeline.py
    public_url.py
    twilio_stream.py
  scripts/
    test_backend_ws.py
  requirements.txt
  .env.example
  README.md
```

## Setup

Python 3.12 is recommended.

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment Setup

Step 1: copy the safe example file:

```bash
cp .env.example .env
```

Never commit your real `.env` file or API keys. `.env` is ignored by git; `.env.example` is safe to commit.

Step 2: for local demo without external services:

```bash
MOCK_CLAUDE=true
PERSIST_TO_MONGO=false
```

Step 3: for MongoDB Atlas:

```bash
PERSIST_TO_MONGO=true
MONGODB_URI="your MongoDB Atlas URI"
```

Step 4: for real Claude:

```bash
MOCK_CLAUDE=false
ANTHROPIC_API_KEY="your Anthropic API key"
```

Step 5: for Android FCM scam alerts:

```bash
FIREBASE_SERVICE_ACCOUNT_FILE="/absolute/path/to/firebase-service-account.json"
GRANDMAS_REAL_NUMBER="+15555550199"
```

Step 6: run backend:

```bash
uvicorn app.main:app --reload
```

Supported modes:

- Mode A, fully local demo: `MOCK_CLAUDE=true`, `PERSIST_TO_MONGO=false`
- Mode B, MongoDB + mock Claude: `MOCK_CLAUDE=true`, `PERSIST_TO_MONGO=true`
- Mode C, MongoDB + real Claude: `MOCK_CLAUDE=false`, `PERSIST_TO_MONGO=true`

If `PERSIST_TO_MONGO=false`, MongoDB writes are skipped safely. If `PERSIST_TO_MONGO=true` but Atlas is unavailable or `MONGODB_URI` is missing, the backend logs `MONGO_ERROR` and continues with in-memory storage.

Startup logs show whether services are configured without printing secrets:

```text
APP_ENV=development
LOG_LEVEL=INFO
MOCK_CLAUDE=true
PERSIST_TO_MONGO=false
MONGO_CONFIGURED=false
CLAUDE_CONFIGURED=false
```

## Run

```bash
uvicorn app.main:app --reload
```

Endpoints:

- Health: `GET http://localhost:8000/health`
- Detection WebSocket: `ws://localhost:8000/detect`
- Twilio voice webhook (TwiML): `POST/GET https://<PUBLIC_BASE_URL>/twilio/voice`
- Twilio Media Stream WebSocket: `wss://<PUBLIC_BASE_URL>/twilio/media` (opened by Twilio; do not call from browser)
- Report: `GET http://localhost:8000/report/{session_id}`
- Debug sessions: `GET http://localhost:8000/debug/sessions`
- Academy scenario list: `GET http://localhost:8000/academy/scenarios`
- Academy scenario detail: `GET http://localhost:8000/academy/scenarios/{scenario_id}?language=en`
- Academy submit attempt: `POST http://localhost:8000/academy/attempt`
- Academy stats: `GET http://localhost:8000/academy/stats?user_id=anonymous`
- Academy scenario audio (MP3): `POST http://localhost:8000/academy/audio/scenario`
- Academy feedback audio (MP3): `POST http://localhost:8000/academy/audio/feedback`

## Docker

Build from the **repository root** so the Dockerfile can copy `backend/firebase.json` (your Firebase Admin service account JSON) into the image at `/app/secrets/firebase-service-account.json`. Without that file, the build fails at the `COPY backend/firebase.json` step.

```bash
cd /path/to/HackDavis
docker build -f backend/Dockerfile -t scamshield-backend .
```

Run with your `backend/.env` (any `FIREBASE_SERVICE_ACCOUNT_FILE` host path is ignored at runtime if the baked-in secret file exists):

```bash
docker run --rm --env-file backend/.env -p 8000:8000 scamshield-backend
```

Docker must be running locally for `docker build` and `docker run`. On macOS, start Docker Desktop first.

**Security:** The service account JSON ends up in an image layer. That is acceptable for many hackathon or private-registry setups; for production, prefer mounting the JSON at run time instead of `COPY`, and avoid pushing that image to a public registry.

For a safe local demo, make sure `.env` contains:

```bash
HOST=0.0.0.0
PORT=8000
MOCK_CLAUDE=true
PERSIST_TO_MONGO=false
```

For hosted deployments, set environment variables in the hosting provider instead of baking secrets into the image. Do not copy real `.env` files into the image.

## WebSocket Input

Send JSON messages to `/detect`:

```json
{
  "transcript": "text here",
  "timestamp": 1746822000
}
```

Malformed JSON, invalid payloads, and empty transcript chunks return JSON error messages. Empty transcript chunks are not stored or scored.

Error responses use:

```json
{
  "error": "invalid_json",
  "detail": "Message must be valid JSON."
}
```

## WebSocket Output

Each valid non-empty transcript chunk returns:

```json
{
  "session_id": "uuid-string",
  "score": 85,
  "alert": true,
  "risk_level": "high",
  "flagged_phrases": ["social security number suspended", "federal warrant"],
  "scam_type": "Government impersonation scam",
  "explanation": "Brief explanation.",
  "transcript": "latest transcript chunk"
}
```

Risk levels:

- `low`: 0-29
- `medium`: 30-69
- `high`: 70-100

`alert` is true only on the first chunk where the hard threshold and Claude confirmation conditions are both met.

## Report Endpoint

After a WebSocket session has sent transcript chunks, use the returned `session_id`:

```bash
curl http://localhost:8000/report/{session_id}
```

Reports are served from memory first. If the session is not in memory and MongoDB persistence is enabled, the backend checks the `call_sessions` collection. Missing sessions return HTTP 404.

## MongoDB Atlas Setup

1. Create a free MongoDB Atlas cluster.
2. Create a database user and allow network access for your development machine.
3. Get the Atlas connection string.
4. Put it in `.env`:

```bash
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="scamshield"
MONGODB_COLLECTION="call_sessions"
PERSIST_TO_MONGO=true
```

5. Start the backend:

```bash
uvicorn app.main:app --reload
```

6. Run the test script:

```bash
python scripts/test_backend_ws.py
```

7. Check MongoDB Atlas for documents in `scamshield.call_sessions`.

## Academy Audio Curl Tests

```bash
curl -X POST http://localhost:8000/academy/audio/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario_id":"ssa_gift_card_001","language":"en","voice_mode":"scammer_simulation"}' \
  --output academy_scenario.mp3
```

```bash
curl -X POST http://localhost:8000/academy/audio/feedback \
  -H "Content-Type: application/json" \
  -d '{"language":"en","score":80,"feedback":"Good job. You identified the main red flags.","safe_action":"Hang up and verify through official channels."}' \
  --output academy_feedback.mp3
```

## Academy Testing

Commands:

Start backend:

```bash
uvicorn app.main:app --reload
```

Run full Academy test:

```bash
python scripts/test_all_academy.py
```

Run only flow test:

```bash
python scripts/test_academy_flow.py
```

Run only audio test:

```bash
python scripts/test_academy_audio.py
```

Run only dataset test:

```bash
python scripts/test_academy_dataset.py
```

If testing through Cloudflared:

```bash
ACADEMY_TEST_BASE_URL=https://your-url.trycloudflare.com python scripts/test_all_academy.py
```

Expected:

- Flow test should pass
- Audio test should either generate MP3 or gracefully report ElevenLabs unavailable
- Dataset test should show public dataset count if `ACADEMY_USE_HF_DATASET=true`

## Test Script

Start the backend, preferably with mock Claude enabled in `.env`, then run:

```bash
python scripts/test_backend_ws.py
```

The script:

- Calls `GET /health`
- Sends a scam transcript
- Waits 1 second between chunks
- Prints every sent transcript and backend response
- Prints when `alert` becomes true
- Prints the `session_id`
- Fetches and prints `GET /report/{session_id}`
- Calls `GET /debug/sessions`

Expected behavior:

- Scam transcript increases score and eventually returns `alert: true`
- Mock Claude logs `CLAUDE_CALL_MOCK` when `MOCK_CLAUDE=true`
- MongoDB stores the session when `PERSIST_TO_MONGO=true` and Atlas is reachable

## How To Manually Verify Pipeline

1. Start backend:

```bash
uvicorn app.main:app --reload
```

2. Run:

```bash
python scripts/test_backend_ws.py
```

3. Check terminal logs for:

```text
WS_CONNECTED
TRANSCRIPT_RECEIVED
RULE_SCORE
SOFT_THRESHOLD_CROSSED
CLAUDE_CALL_MOCK or CLAUDE_CALL_REAL
CLAUDE_RESULT
HARD_THRESHOLD_CROSSED
ALERT_TRIGGERED
MONGO_SESSION_UPDATED
```

4. Open:

```text
http://localhost:8000/health
```

5. Open:

```text
http://localhost:8000/report/{session_id}
```

6. Check MongoDB Atlas collection `call_sessions`.
