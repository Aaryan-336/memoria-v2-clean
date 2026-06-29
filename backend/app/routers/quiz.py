"""
Memoria AI — Quiz Router

Quiz generation endpoint. Quizzes are generated on-the-fly, not persisted.
All endpoints require authentication.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.middleware.subscription import SubscriptionDep, check_daily_quota
from app.models.schemas import GenerateQuizRequest
from app.services.ai_service import generate_quiz
from app.services.usage_service import increment_usage, track_usage_to_db, log_usage_event

router = APIRouter(prefix="/api", tags=["quiz"])


@router.post("/quiz/generate")
async def create_quiz(
    req: GenerateQuizRequest,
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Generate a multiple-choice quiz for a specific note. Requires authentication.

    Quizzes are NOT persisted — they are generated fresh each time.
    """
    # Enforce daily quota
    check_daily_quota(sub, "quizzes_generated", "max_ai_queries_daily")

    try:
        # Fetch the note and verify ownership
        note_resp = (
            db.table("notes")
            .select("id, title, transcript, notes, topics, user_id")
            .eq("id", req.note_id)
            .eq("user_id", current_user.user_id)
            .execute()
        )

        if not note_resp.data:
            raise HTTPException(status_code=404, detail="Note not found")

        note = note_resp.data[0]

        # Build content for AI — combine transcript and notes
        content = note.get("transcript", "") or ""
        if note.get("notes"):
            content += "\n\n" + note["notes"]

        if not content.strip():
            raise HTTPException(
                status_code=400,
                detail="Note has no content to generate a quiz from",
            )

        # Generate quiz via AI
        questions = generate_quiz(
            api_key=settings.anthropic_api_key,
            transcript=content,
            note_title=note.get("title", ""),
            topics=note.get("topics", []),
            num_questions=req.num_questions,
        )

        if not questions:
            raise HTTPException(
                status_code=500, detail="AI failed to generate quiz questions"
            )

        # Track usage after successful generation
        increment_usage(current_user.user_id, "quizzes_generated")
        track_usage_to_db(db, current_user.user_id, "quizzes_generated")
        log_usage_event(db, current_user.user_id, "quiz_generated", {"note_id": req.note_id, "questions": len(questions)})

        return {
            "success": True,
            "note_title": note.get("title", "Quiz"),
            "questions": questions,
            "num_questions": len(questions),
            "time_per_question": 30,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
