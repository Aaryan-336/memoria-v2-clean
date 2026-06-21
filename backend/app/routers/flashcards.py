"""
Memoria AI — Flashcards Router

CRUD + AI generation endpoints for flashcards. All endpoints require authentication.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.models.schemas import GenerateFlashcardsRequest
from app.services.ai_service import generate_flashcards

router = APIRouter(prefix="/api", tags=["flashcards"])


@router.post("/flashcards/generate")
async def create_flashcards(
    req: GenerateFlashcardsRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Generate AI flashcards for a specific note. Requires authentication."""
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
                detail="Note has no content to generate flashcards from",
            )

        # Generate flashcards via AI
        cards = generate_flashcards(
            api_key=settings.anthropic_api_key,
            transcript=content,
            note_title=note.get("title", ""),
            topics=note.get("topics", []),
        )

        if not cards:
            raise HTTPException(
                status_code=500, detail="AI failed to generate flashcards"
            )

        # Delete existing flashcards for this note
        db.table("flashcards").delete().eq(
            "note_id", req.note_id
        ).eq("user_id", current_user.user_id).execute()

        # Insert new flashcards
        rows = [
            {
                "note_id": req.note_id,
                "user_id": current_user.user_id,
                "topic": card.get("topic", "Untitled"),
                "content": card.get("content", ""),
                "difficulty": card.get("difficulty", "medium"),
                "sort_order": i,
            }
            for i, card in enumerate(cards)
        ]

        result = db.table("flashcards").insert(rows).execute()

        return {"success": True, "flashcards": result.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flashcards/{note_id}")
async def get_flashcards(
    note_id: str,
    current_user: CurrentUser,
    db: DatabaseDep,
):
    """Get all flashcards for a specific note. Requires authentication."""
    try:
        # Verify note belongs to user
        note_check = (
            db.table("notes")
            .select("id")
            .eq("id", note_id)
            .eq("user_id", current_user.user_id)
            .execute()
        )

        if not note_check.data:
            raise HTTPException(status_code=404, detail="Note not found")

        flashcards = (
            db.table("flashcards")
            .select("*")
            .eq("note_id", note_id)
            .eq("user_id", current_user.user_id)
            .order("sort_order", desc=False)
            .execute()
        )

        return {"flashcards": flashcards.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/flashcards/{note_id}")
async def delete_flashcards(
    note_id: str,
    current_user: CurrentUser,
    db: DatabaseDep,
):
    """Delete all flashcards for a specific note. Requires authentication."""
    try:
        db.table("flashcards").delete().eq(
            "note_id", note_id
        ).eq("user_id", current_user.user_id).execute()

        return {"success": True, "message": "Flashcards deleted"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
