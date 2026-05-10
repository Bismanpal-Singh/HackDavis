import json
import logging
from typing import Any

from app.config import settings

try:
    from anthropic import Anthropic, APITimeoutError
except ImportError:  # pragma: no cover - lets local checks run before dependencies are installed.
    Anthropic = None
    APITimeoutError = TimeoutError


logger = logging.getLogger("scamshield")


SAFE_FALLBACK = {
    "is_scam": False,
    "confidence": 0,
    "scam_type": None,
    "matched_known_script": False,
    "flagged_phrases": [],
    "explanation": None,
}


MOCK_SCAM_PHRASES = [
    "social security number has been suspended",
    "social security number suspended",
    "federal warrant",
    "you will be arrested",
    "pay with gift cards",
    "gift card",
    "do not hang up",
    "read me the verification code",
    "verification code",
    "install anydesk",
    "remote access",
]


SYSTEM_PROMPT = """
You classify scam behavior from phone transcript text for ScamShield.
Return JSON only. Do not include markdown, prose, or extra keys.

Known scam categories:
- IRS impersonation
- Social Security suspension scam
- bank fraud support scam
- gift card payment scam
- crypto payment scam
- tech support remote access scam
- fake package/customs scam
- immigration threat scam
- family emergency scam
- law enforcement arrest warrant scam
- verification code theft scam

Return exactly this JSON schema:
{
  "is_scam": true,
  "confidence": 87,
  "scam_type": "Government impersonation scam",
  "matched_known_script": true,
  "flagged_phrases": ["social security suspended", "federal warrant"],
  "explanation": "Brief user-facing explanation."
}
"""


def _fallback() -> dict:
    return SAFE_FALLBACK.copy()


def _strip_optional_markdown_json_fence(raw: str) -> str:
    """Return text suitable for json.loads when Claude wraps JSON in ``` fences."""
    text = raw.strip()
    fence = "```"
    if fence not in text:
        return text

    start = text.find(fence)
    after_open = text[start + len(fence) :].lstrip("\n")

    first_nl = after_open.find("\n")
    if first_nl != -1:
        first_line = after_open[:first_nl].strip()
        if first_line and not first_line.startswith(("{", "[")):
            body = after_open[first_nl + 1 :]
        else:
            body = after_open
    else:
        body = after_open

    end = body.rfind(fence)
    if end != -1:
        body = body[:end]

    return body.strip()


def _normalize_result(result: dict[str, Any]) -> dict:
    return {
        "is_scam": bool(result.get("is_scam", False)),
        "confidence": int(result.get("confidence", 0)),
        "scam_type": result.get("scam_type"),
        "matched_known_script": bool(result.get("matched_known_script", False)),
        "flagged_phrases": list(result.get("flagged_phrases", [])),
        "explanation": result.get("explanation"),
    }


def _mock_validate(current_chunk: str, context: str) -> dict:
    searchable_text = f"{context} {current_chunk}".casefold()
    flagged_phrases = [
        phrase for phrase in MOCK_SCAM_PHRASES if phrase.casefold() in searchable_text
    ]

    if flagged_phrases:
        return {
            "is_scam": True,
            "confidence": 92,
            "scam_type": "Government impersonation scam",
            "matched_known_script": True,
            "flagged_phrases": flagged_phrases,
            "explanation": (
                "The caller is using urgent threats or payment instructions that match "
                "common scam patterns."
            ),
        }

    return {
        "is_scam": False,
        "confidence": 20,
        "scam_type": None,
        "matched_known_script": False,
        "flagged_phrases": [],
        "explanation": None,
    }


class ClaudeValidator:
    def __init__(self) -> None:
        self.client = None
        if settings.ANTHROPIC_API_KEY and Anthropic is not None:
            self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=10.0)

    def validate(self, current_chunk: str, context: str) -> dict:
        if settings.MOCK_CLAUDE:
            return _mock_validate(current_chunk=current_chunk, context=context)

        if not settings.ANTHROPIC_API_KEY or self.client is None:
            logger.info("Skipping Claude validation because ANTHROPIC_API_KEY is not configured.")
            return _fallback()

        user_prompt = {
            "current_chunk": current_chunk,
            "recent_context": context,
        }

        try:
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=500,
                temperature=0,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": json.dumps(user_prompt),
                    }
                ],
            )
            raw_text = response.content[0].text
            json_text = _strip_optional_markdown_json_fence(raw_text)
            parsed = json.loads(json_text)
            if not isinstance(parsed, dict):
                return _fallback()
            return _normalize_result(parsed)
        except (APITimeoutError, TimeoutError):
            logger.warning("Claude validation timed out.")
            return _fallback()
        except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError) as exc:
            logger.warning("Claude returned invalid JSON: %s", exc)
            return _fallback()
        except Exception as exc:
            logger.warning("Claude validation failed: %s", exc)
            return _fallback()
