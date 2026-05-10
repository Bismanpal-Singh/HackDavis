import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")


def get_bool_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default

    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    return default


def get_int_env(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def get_float_env(name: str, default: float) -> float:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    APP_ENV: str = os.environ.get("APP_ENV", "development")
    APP_NAME: str = os.environ.get("APP_NAME", "ScamShield Backend")
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    HOST: str = os.environ.get("HOST", "0.0.0.0")
    PORT: int = get_int_env("PORT", 8000)

    SOFT_THRESHOLD: int = get_int_env("SOFT_THRESHOLD", 30)
    HARD_THRESHOLD: int = get_int_env("HARD_THRESHOLD", 70)
    CLAUDE_CONFIDENCE_THRESHOLD: int = get_int_env("CLAUDE_CONFIDENCE_THRESHOLD", 70)
    CLAUDE_COOLDOWN_SECONDS: float = get_float_env("CLAUDE_COOLDOWN_SECONDS", 15)

    MOCK_CLAUDE: bool = get_bool_env("MOCK_CLAUDE", False)
    ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.environ.get("CLAUDE_MODEL", "claude-3-5-sonnet-latest")

    PERSIST_TO_MONGO: bool = get_bool_env("PERSIST_TO_MONGO", False)
    MONGODB_URI: str = os.environ.get("MONGODB_URI", "")
    MONGODB_DB: str = os.environ.get("MONGODB_DB", "scamshield")
    MONGODB_COLLECTION: str = os.environ.get("MONGODB_COLLECTION", "call_sessions")
    MONGODB_USERS_COLLECTION: str = os.environ.get("MONGODB_USERS_COLLECTION", "users")
    ALLOWED_ORIGINS: str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174")

    TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_API_KEY_SID: str = os.environ.get("TWILIO_API_KEY_SID", "")
    TWILIO_API_KEY_SECRET: str = os.environ.get("TWILIO_API_KEY_SECRET", "")
    TWILIO_PHONE_NUMBER: str = os.environ.get("TWILIO_PHONE_NUMBER", "")
    PUBLIC_BASE_URL: str = os.environ.get("PUBLIC_BASE_URL", "")
    DEEPGRAM_API_KEY: str = os.environ.get("DEEPGRAM_API_KEY", "")

    @property
    def CLAUDE_CONFIGURED(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

    @property
    def MONGO_CONFIGURED(self) -> bool:
        return bool(self.MONGODB_URI)

    @property
    def TWILIO_CONFIGURED(self) -> bool:
        return bool(self.TWILIO_ACCOUNT_SID and self.TWILIO_API_KEY_SID and self.TWILIO_API_KEY_SECRET)

    @property
    def DEEPGRAM_CONFIGURED(self) -> bool:
        return bool(self.DEEPGRAM_API_KEY)


settings = Settings()
