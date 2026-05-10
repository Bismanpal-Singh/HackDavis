import os
import json
from dotenv import load_dotenv
from anthropic import Anthropic


def strip_optional_markdown_json_fence(raw: str) -> str:
    """
    Claude sometimes returns JSON wrapped in Markdown fences like:

    ```json
    { ... }
    ```

    This removes the fence before json.loads().
    Plain JSON is returned unchanged.
    """
    text = raw.strip()
    fence = "```"

    if fence not in text:
        return text

    start = text.find(fence)
    after_open = text[start + len(fence):].lstrip("\n")

    first_nl = after_open.find("\n")
    if first_nl != -1:
        first_line = after_open[:first_nl].strip()

        # Handles ```json, ```JSON, ```javascript, etc.
        # But if JSON starts immediately after the fence, keep it.
        if first_line and not first_line.startswith(("{", "[")):
            body = after_open[first_nl + 1:]
        else:
            body = after_open
    else:
        body = after_open

    end = body.rfind(fence)
    if end != -1:
        body = body[:end]

    return body.strip()


load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY")
model = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

if not api_key:
    raise RuntimeError("ANTHROPIC_API_KEY is missing. Add it to backend/.env")

print("CLAUDE_TEST_START")
print(f"MODEL={model}")
print(f"API_KEY_CONFIGURED={bool(api_key)}")

client = Anthropic(api_key=api_key)

prompt = """
Classify this phone transcript as scam or not scam.

Transcript:
"This is the Social Security Administration. Your social security number has been suspended.
There is a federal warrant under your name. Do not hang up. You need to pay immediately using gift cards."

Return raw JSON only. Do not wrap the JSON in Markdown. Do not use code fences.

Required JSON schema:
{
  "is_scam": true,
  "confidence": 0,
  "scam_type": "",
  "matched_known_script": true,
  "flagged_phrases": [],
  "explanation": ""
}
"""

message = client.messages.create(
    model=model,
    max_tokens=500,
    temperature=0,
    messages=[
        {
            "role": "user",
            "content": prompt
        }
    ]
)

text = message.content[0].text

print("CLAUDE_RAW_RESPONSE:")
print(text)

try:
    clean_text = strip_optional_markdown_json_fence(text)

    print("CLAUDE_CLEANED_RESPONSE:")
    print(clean_text)

    parsed = json.loads(clean_text)

    print("CLAUDE_JSON_PARSED_SUCCESS")
    print(json.dumps(parsed, indent=2))

except Exception as e:
    print("CLAUDE_JSON_PARSE_FAILED")
    print(str(e))