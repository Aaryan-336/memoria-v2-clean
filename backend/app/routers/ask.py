"""
Memoria AI — Ask Router

Q&A endpoint for chatting with notes. Requires authentication.
Moved from main.py ask endpoint.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.models.schemas import AskRequest
from app.services.ai_service import answer_question

router = APIRouter(prefix="/api", tags=["ask"])


@router.post("/ask")
async def ask(
    req: AskRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Ask a question about your notes. Requires authentication."""
    try:
        # Get recent notes for context
        notes = (
            db.table("notes")
            .select("title, summary, notes, topics")
            .eq("user_id", current_user.user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        context = "\n\n".join([
            f"Note: {n['title']}\nSummary: {n['summary']}\n{n['notes']}"
            for n in notes.data
        ])

        answer = answer_question(
            settings.anthropic_api_key,
            req.question,
            context,
            req.session_context,
        )
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
