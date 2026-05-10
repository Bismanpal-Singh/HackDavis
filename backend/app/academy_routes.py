import logging

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.academy_scenarios import get_scenario_for_language, list_scenario_summaries
from app.academy_store import academy_store
from app.elevenlabs_tts import elevenlabs_tts


logger = logging.getLogger("scamshield")
academy_router = APIRouter(prefix="/academy", tags=["academy"])


class AcademyAttemptRequest(BaseModel):
    scenario_id: str = Field(..., description="Unique scenario id.")
    language: str = Field("en", description="Preferred language code.")
    user_label: str = Field(..., description="User selected label: scam or safe.")
    selected_red_flags: list[str] = Field(default_factory=list, description="Selected suspicious phrases.")
    user_id: str = Field("anonymous", description="Client-side user identifier.")


class AcademyScenarioAudioRequest(BaseModel):
    scenario_id: str = Field(..., description="Unique scenario id.")
    language: str = Field("en", description="Preferred language code.")
    voice_mode: str = Field("calm_coach", description="TTS mode: calm_coach, scammer_simulation, safety_explainer.")


class AcademyFeedbackAudioRequest(BaseModel):
    language: str = Field("en", description="Preferred language code.")
    score: int = Field(..., description="Score from Academy attempt.")
    feedback: str = Field(..., description="Feedback text from grading response.")
    safe_action: str = Field(..., description="Safe action guidance.")


def _normalize_phrase(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _ensure_elevenlabs_enabled(language: str) -> None:
    if not elevenlabs_tts.is_enabled():
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs is disabled or missing API key/voice configuration.",
        )
    if not elevenlabs_tts.get_voice_id(language):
        raise HTTPException(
            status_code=503,
            detail=f"ElevenLabs voice ID is missing for language '{language}'.",
        )


@academy_router.get("/scenarios")
async def list_academy_scenarios() -> list[dict]:
    scenarios = list_scenario_summaries()
    logger.info("ACADEMY_SCENARIOS_LISTED count=%d", len(scenarios))
    return scenarios


@academy_router.get("/scenarios/{scenario_id}")
async def get_academy_scenario(
    scenario_id: str,
    language: str = Query("en", description="Language code. Supported: en, hi, es"),
) -> dict:
    scenario = get_scenario_for_language(scenario_id, language)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    logger.info("ACADEMY_SCENARIO_FETCHED scenario_id=%s language=%s", scenario_id, scenario["language"])
    return scenario


@academy_router.post("/attempt")
async def submit_academy_attempt(body: AcademyAttemptRequest) -> dict:
    scenario = get_scenario_for_language(body.scenario_id, body.language)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    expected_flags = [_normalize_phrase(flag["phrase"]) for flag in scenario["red_flags"]]
    expected_lookup = {normalized: scenario["red_flags"][index]["phrase"] for index, normalized in enumerate(expected_flags)}
    selected_normalized = {_normalize_phrase(flag) for flag in body.selected_red_flags if flag.strip()}

    expected_set = set(expected_flags)
    correct_selected = selected_normalized.intersection(expected_set)
    missed = [expected_lookup[item] for item in expected_flags if item not in correct_selected]
    incorrect = sorted(selected_normalized.difference(expected_set))

    correct_label = body.user_label.strip().lower() == scenario["label"]
    label_points = 40 if correct_label else 0

    if not expected_set:
        selection_points = 40
    else:
        selection_points = round(40 * (len(correct_selected) / len(expected_set)))

    if not selected_normalized:
        precision_points = 20
    else:
        incorrect_ratio = len(incorrect) / len(selected_normalized)
        precision_points = max(0, round(20 * (1 - incorrect_ratio)))

    score = min(100, label_points + selection_points + precision_points)
    incorrect_red_flags = [flag for flag in body.selected_red_flags if _normalize_phrase(flag) in incorrect]

    if correct_label and not missed and not incorrect_red_flags:
        feedback = "Excellent work. You correctly identified the scenario and selected the right warning signs."
    elif correct_label:
        feedback = (
            "Good job. You identified the right label. Review missed cues to improve spotting pressure or manipulation."
        )
    else:
        feedback = "This scenario was mislabeled. Focus on authority claims, urgency, secrecy, and payment patterns."

    result = {
        "score": score,
        "correct_label": correct_label,
        "missed_red_flags": missed,
        "incorrect_red_flags": incorrect_red_flags,
        "feedback": feedback,
        "safe_action": scenario["safe_action"],
        "teaching_summary": scenario["teaching_summary"],
    }

    academy_store.save_attempt(
        {
            "scenario_id": scenario["scenario_id"],
            "scam_type": scenario["scam_type"],
            "language": scenario["language"],
            "user_label": body.user_label.strip().lower(),
            "selected_red_flags": body.selected_red_flags,
            "user_id": body.user_id.strip() or "anonymous",
            "score": score,
            "correct_label": correct_label,
            "missed_red_flags": missed,
            "incorrect_red_flags": incorrect_red_flags,
        }
    )

    logger.info(
        "ACADEMY_ATTEMPT_SUBMITTED scenario_id=%s user_id=%s language=%s score=%d",
        scenario["scenario_id"],
        body.user_id.strip() or "anonymous",
        scenario["language"],
        score,
    )
    return result


@academy_router.get("/stats")
async def get_academy_stats(user_id: str = Query("anonymous", description="Client-side user identifier")) -> dict:
    normalized_user_id = user_id.strip() or "anonymous"
    logger.info("ACADEMY_STATS_FETCHED user_id=%s", normalized_user_id)
    return academy_store.build_stats(normalized_user_id)


@academy_router.post("/audio/scenario")
async def get_scenario_audio(body: AcademyScenarioAudioRequest) -> Response:
    scenario = get_scenario_for_language(body.scenario_id, body.language)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    language = scenario["language"]
    _ensure_elevenlabs_enabled(language)
    logger.info(
        "ELEVENLABS_ACADEMY_SCENARIO_AUDIO_REQUEST scenario_id=%s language=%s voice_mode=%s",
        scenario["scenario_id"],
        language,
        body.voice_mode,
    )

    intro_by_language = {
        "en": "Training scenario. Listen carefully and decide if this is a scam.",
        "hi": "प्रशिक्षण परिदृश्य। ध्यान से सुनिए और तय कीजिए कि यह स्कैम है या नहीं।",
        "es": "Escenario de entrenamiento. Escuche con atención y decida si es una estafa.",
    }
    intro = intro_by_language.get(language, intro_by_language["en"])
    spoken_script = " ".join([intro, *scenario["transcript"]])

    try:
        audio_bytes = elevenlabs_tts.generate_audio(
            text=spoken_script,
            language=language,
            voice_mode=body.voice_mode,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    logger.info(
        "ELEVENLABS_ACADEMY_SCENARIO_AUDIO_SUCCESS scenario_id=%s bytes=%d",
        scenario["scenario_id"],
        len(audio_bytes),
    )
    return Response(content=audio_bytes, media_type="audio/mpeg")


@academy_router.post("/audio/feedback")
async def get_feedback_audio(body: AcademyFeedbackAudioRequest) -> Response:
    language = (body.language or "en").strip().lower()
    _ensure_elevenlabs_enabled(language)
    logger.info("ELEVENLABS_ACADEMY_FEEDBACK_AUDIO_REQUEST language=%s", language)

    if language == "hi":
        script = (
            f"स्कोर {body.score} में से 100. फीडबैक: {body.feedback}. "
            f"सुरक्षित कदम: {body.safe_action}."
        )
    elif language == "es":
        script = (
            f"Puntaje {body.score} de 100. Retroalimentacion: {body.feedback}. "
            f"Accion segura: {body.safe_action}."
        )
    else:
        script = (
            f"Your score is {body.score} out of 100. "
            f"Feedback: {body.feedback}. "
            f"Safe action: {body.safe_action}."
        )

    try:
        audio_bytes = elevenlabs_tts.generate_audio(
            text=script,
            language=language,
            voice_mode="safety_explainer",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    logger.info("ELEVENLABS_ACADEMY_FEEDBACK_AUDIO_SUCCESS bytes=%d", len(audio_bytes))
    return Response(content=audio_bytes, media_type="audio/mpeg")
