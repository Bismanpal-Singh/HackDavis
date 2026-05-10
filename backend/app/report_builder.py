from app.decision_engine import dedupe_phrases, get_risk_level
from app.session_store import SessionState


def build_report(session: SessionState) -> dict:
    claude_result = session.latest_claude_result or {}
    scores = [entry["score"] for entry in session.score_history]

    return {
        "session_id": session.session_id,
        "final_score": session.current_score,
        "max_score": max(scores, default=session.current_score),
        "alert_triggered": session.alert_triggered,
        "scam_type": claude_result.get("scam_type"),
        "explanation": claude_result.get("explanation"),
        "flagged_phrases": dedupe_phrases(session.flagged_phrases),
        "timeline": [
            {
                "timestamp": entry["timestamp"],
                "score": entry["score"],
                "risk_level": get_risk_level(entry["score"]),
            }
            for entry in session.score_history
        ],
        "transcript": [
            {
                "timestamp": entry.timestamp,
                "text": entry.text,
            }
            for entry in session.transcript_entries
        ],
    }


def build_report_from_document(document: dict) -> dict:
    return {
        "session_id": document["session_id"],
        "final_score": document.get("current_score", 0),
        "max_score": document.get("max_score", document.get("current_score", 0)),
        "alert_triggered": document.get("alert_triggered", False),
        "scam_type": (document.get("latest_claude_result") or {}).get("scam_type"),
        "explanation": (document.get("latest_claude_result") or {}).get("explanation"),
        "flagged_phrases": dedupe_phrases(document.get("flagged_phrases", [])),
        "timeline": [
            {
                "timestamp": entry["timestamp"],
                "score": entry["score"],
                "risk_level": entry.get("risk_level", get_risk_level(entry["score"])),
            }
            for entry in document.get("score_history", [])
        ],
        "transcript": [
            {
                "timestamp": entry["timestamp"],
                "text": entry["text"],
            }
            for entry in document.get("transcript_entries", [])
        ],
    }
