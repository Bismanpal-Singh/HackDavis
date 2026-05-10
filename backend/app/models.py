from pydantic import BaseModel, Field


class TranscriptChunk(BaseModel):
    transcript: str = Field(..., description="Latest transcript text chunk.")
    timestamp: float = Field(..., description="Unix timestamp for the transcript chunk.")


class RiskResponse(BaseModel):
    session_id: str
    score: int
    alert: bool
    risk_level: str
    flagged_phrases: list[str]
    scam_type: str | None
    explanation: str | None
    transcript: str | None


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
