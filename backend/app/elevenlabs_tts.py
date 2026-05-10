import logging

import httpx

from app.config import settings


logger = logging.getLogger("scamshield")


class ElevenLabsTTS:
    _VOICE_MODES = {
        "calm_coach": {"stability": 0.60, "similarity_boost": 0.75, "style": 0.20, "use_speaker_boost": True},
        "scammer_simulation": {
            "stability": 0.35,
            "similarity_boost": 0.70,
            "style": 0.55,
            "use_speaker_boost": True,
        },
        "safety_explainer": {"stability": 0.70, "similarity_boost": 0.80, "style": 0.15, "use_speaker_boost": True},
    }

    def is_enabled(self) -> bool:
        if not settings.ENABLE_ELEVENLABS:
            return False
        if not settings.ELEVENLABS_API_KEY.strip():
            return False
        return bool(self.get_voice_id("en"))

    def get_voice_id(self, language: str) -> str:
        normalized = (language or "en").strip().lower()
        if normalized == "hi":
            return (settings.ELEVENLABS_VOICE_ID_HI or settings.ELEVENLABS_VOICE_ID or "").strip()
        if normalized == "es":
            return (settings.ELEVENLABS_VOICE_ID_ES or settings.ELEVENLABS_VOICE_ID or "").strip()
        return (settings.ELEVENLABS_VOICE_ID_EN or settings.ELEVENLABS_VOICE_ID or "").strip()

    def generate_audio(self, text: str, language: str = "en", voice_mode: str = "calm_coach") -> bytes:
        if not text.strip():
            raise ValueError("Text for TTS must not be empty.")

        if not settings.ENABLE_ELEVENLABS:
            raise RuntimeError("ElevenLabs is disabled by configuration.")
        if not settings.ELEVENLABS_API_KEY.strip():
            raise RuntimeError("ElevenLabs API key is missing.")

        voice_id = self.get_voice_id(language)
        if not voice_id:
            raise RuntimeError(f"ElevenLabs voice id missing for language={language}.")

        selected_mode = voice_mode if voice_mode in self._VOICE_MODES else "calm_coach"
        payload = {
            "text": text,
            "model_id": settings.ELEVENLABS_MODEL_ID,
            "language_code": (language or "en").strip().lower(),
            "voice_settings": self._VOICE_MODES[selected_mode],
        }

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }

        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(url, json=payload, headers=headers)
            if response.status_code != 200:
                logger.error(
                    "ELEVENLABS_TTS_ERROR message=status=%s body=%s",
                    response.status_code,
                    response.text[:300],
                )
                raise RuntimeError(f"ElevenLabs TTS failed with status {response.status_code}.")
            if not response.content:
                logger.error("ELEVENLABS_TTS_ERROR message=empty audio response")
                raise RuntimeError("ElevenLabs returned empty audio.")
            return response.content
        except Exception as exc:
            logger.error("ELEVENLABS_TTS_ERROR message=%s", str(exc))
            raise RuntimeError("Unable to generate ElevenLabs audio.") from exc


elevenlabs_tts = ElevenLabsTTS()
