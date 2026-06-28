"""
Memoria AI — Notes Router

CRUD endpoints for notes. All endpoints require authentication.
Moved from main.py generate_notes + get_notes endpoints.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.middleware.subscription import SubscriptionDep, check_memory_limit
from app.models.schemas import ProcessRequest
from app.services.ai_service import process_transcript
from app.services.subscription_service import get_user_memories_count
from app.services.usage_service import increment_usage, track_usage_to_db, log_usage_event

from typing import Optional

router = APIRouter(prefix="/api", tags=["notes"])


@router.post("/generate-notes")
async def generate_notes(
    req: ProcessRequest,
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Generate AI notes from a transcript. Requires authentication."""
    # Check memory limit before creating a new note
    memories_count = get_user_memories_count(db, current_user.user_id)
    check_memory_limit(sub, memories_count)

    try:
        result = process_transcript(
            settings.anthropic_api_key,
            req.transcript,
            note_format=req.note_format,
        )
        if not result:
            raise HTTPException(status_code=500, detail="AI processing failed")

        # Save to Supabase — user_id from JWT
        note_data = {
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
        }
        if req.workspace_id:
            note_data["workspace_id"] = req.workspace_id

        try:
            note = db.table("notes").insert(note_data).execute()
        except Exception as e:
            if "workspace_id" in str(e) or "PGRST204" in str(e):
                print(f"Warning: workspace_id column is missing from notes table. Retrying note creation without workspace scoping. Error: {e}")
                note_data.pop("workspace_id", None)
                note = db.table("notes").insert(note_data).execute()
            else:
                raise

        # Track usage after successful note creation
        increment_usage(current_user.user_id, "notes_created")
        track_usage_to_db(db, current_user.user_id, "notes_created")
        log_usage_event(db, current_user.user_id, "note_created", {"source": req.source_type})

        return {"success": True, "note": note.data[0], "ai": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notes")
async def get_notes(
    current_user: CurrentUser,
    db: DatabaseDep,
    workspace_id: Optional[str] = None,
):
    """Get all notes for the authenticated user, optionally scoped to a workspace."""
    try:
        query = db.table("notes").select("*").order("created_at", desc=True)
        if workspace_id and workspace_id != "personal" and workspace_id != "null":
            # Show notes for this workspace
            query = query.eq("workspace_id", workspace_id)
        else:
            # Default to personal notes (workspace_id is null)
            query = query.eq("user_id", current_user.user_id).is_("workspace_id", "null")
            
        notes = query.execute()
        return {"notes": notes.data}
    except Exception as e:
        # Fallback if workspace_id query fails (e.g. database schema is not updated)
        try:
            print(f"Notes fetch warning, falling back to simple personal check: {e}")
            notes = (
                db.table("notes")
                .select("*")
                .eq("user_id", current_user.user_id)
                .order("created_at", desc=True)
                .execute()
            )
            # If workspace_id is provided, filter manually in python for robustness
            if workspace_id and workspace_id != "personal" and workspace_id != "null":
                filtered = [n for n in notes.data if n.get("workspace_id") == workspace_id]
                return {"notes": filtered}
            else:
                filtered = [n for n in notes.data if not n.get("workspace_id")]
                return {"notes": filtered}
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=str(fallback_err))
