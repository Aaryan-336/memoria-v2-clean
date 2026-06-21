"""
Memoria AI — Notes Router

CRUD endpoints for notes. All endpoints require authentication.
Moved from main.py generate_notes + get_notes endpoints.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.models.schemas import ProcessRequest
from app.services.ai_service import process_transcript

router = APIRouter(prefix="/api", tags=["notes"])


@router.post("/generate-notes")
async def generate_notes(
    req: ProcessRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Generate AI notes from a transcript. Requires authentication."""
    try:
        result = process_transcript(
            settings.anthropic_api_key,
            req.transcript,
            note_format=req.note_format,
        )
        if not result:
            raise HTTPException(status_code=500, detail="AI processing failed")

        # Save to Supabase — user_id from JWT
        note = db.table("notes").insert({
            "user_id": current_user.user_id,
            "title": result.get("title", "Untitled"),
            "transcript": req.transcript,
            "summary": result.get("summary", ""),
            "notes": result.get("notes", ""),
            "key_points": result.get("key_points", []),
            "topics": result.get("topics", []),
            "action_items": result.get("action_items", []),
            "exam_questions": result.get("exam_questions", []),
            "reminders": result.get("reminders", []),
            "mermaid_diagram": result.get("mermaid_diagram", ""),
            "source_type": req.source_type,
        }).execute()

        return {"success": True, "note": note.data[0], "ai": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notes")
async def get_notes(
    current_user: CurrentUser,
    db: DatabaseDep,
):
    """Get all notes for the authenticated user."""
    try:
        notes = (
            db.table("notes")
            .select("*")
            .eq("user_id", current_user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"notes": notes.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
