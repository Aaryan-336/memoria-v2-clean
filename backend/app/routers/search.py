"""
Memoria AI — Search Router

Search endpoint for finding notes. Requires authentication.
Moved from main.py search endpoint.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search(
    q: str,
    current_user: CurrentUser,
    db: DatabaseDep,
):
    """Search across notes for the authenticated user."""
    try:
        results = (
            db.table("notes")
            .select("*")
            .eq("user_id", current_user.user_id)
            .ilike("notes", f"%{q}%")
            .execute()
        )
        return {"results": results.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
