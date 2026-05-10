from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    google_sub: str = Field(..., description="Google OAuth subject ID (persistent unique identifier).")
    dialed_phone: str = Field(..., description="The user's phone number that Twilio routes calls to.")


class SafelistRequest(BaseModel):
    google_sub: str = Field(..., description="Google OAuth subject ID for the user.")
    phone_numbers: list[str] = Field(default_factory=list, description="Normalized trusted contact phone numbers.")


class PushTokenRequest(BaseModel):
    google_sub: str = Field(..., description="Google OAuth subject ID for the user.")
    platform: str = Field(..., description="Device platform, for example android or ios.")
    provider: str = Field(..., description="Push provider, for example fcm or apns.")
    token: str = Field(..., description="Push notification device token.")


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
