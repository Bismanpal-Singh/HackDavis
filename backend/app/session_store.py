from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


@dataclass
class TranscriptEntry:
    text: str
    timestamp: float


@dataclass
class SessionState:
    session_id: str
    caller_phone: str | None = None
    dialed_phone: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"
    transcript_entries: list[TranscriptEntry] = field(default_factory=list)
    score_history: list[dict] = field(default_factory=list)
    current_score: int = 0
    max_score: int = 0
    matched_categories: list[str] = field(default_factory=list)
    flagged_phrases: list[str] = field(default_factory=list)
    latest_claude_result: dict | None = None
    last_claude_call_time: float | None = None
    alert_triggered: bool = False
    alert_triggered_at: datetime | None = None
    soft_threshold_logged: bool = False
    hard_threshold_logged: bool = False

    def add_transcript(self, text: str, timestamp: float) -> None:
        self.transcript_entries.append(TranscriptEntry(text=text, timestamp=timestamp))
        self.updated_at = datetime.now(timezone.utc)

    def get_full_transcript(self) -> str:
        return " ".join(entry.text for entry in self.transcript_entries)

    def get_recent_context(self, seconds: float = 60) -> str:
        if not self.transcript_entries:
            return ""

        latest_timestamp = self.transcript_entries[-1].timestamp
        cutoff = latest_timestamp - seconds
        return " ".join(
            entry.text for entry in self.transcript_entries if entry.timestamp >= cutoff
        )


class InMemorySessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}

    def create_session(self) -> SessionState:
        session = SessionState(session_id=str(uuid4()))
        self._sessions[session.session_id] = session
        return session

    def get_or_create_by_id(self, session_id: str) -> tuple[SessionState, bool]:
        """Return existing session or create one with the given id (e.g. Twilio CallSid)."""
        existing = self._sessions.get(session_id)
        if existing is not None:
            return existing, False
        session = SessionState(session_id=session_id)
        self._sessions[session_id] = session
        return session, True

    def get_session(self, session_id: str) -> SessionState | None:
        return self._sessions.get(session_id)

    def list_sessions(self) -> list[SessionState]:
        return list(self._sessions.values())


session_store = InMemorySessionStore()
