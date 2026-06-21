"""
Memoria AI — Quiz Router

Quiz generation endpoint. Quizzes are generated on-the-fly, not persisted.
All endpoints require authentication.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.models.schemas import GenerateQuizRequest
from app.services.ai_service import generate_quiz

router = APIRouter(prefix="/api", tags=["quiz"])


@router.post("/quiz/generate")
async def create_quiz(
    req: GenerateQuizRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Generate a multiple-choice quiz for a specific note. Requires authentication.

    Quizzes are NOT persisted — they are generated fresh each time.
    """
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
