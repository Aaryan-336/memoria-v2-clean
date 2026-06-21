"""
Memoria AI — Health Router

Health and readiness checks. No authentication required.
"""

from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import SettingsDep, get_db
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(settings: SettingsDep) -> HealthResponse:
    """Health check with Supabase connectivity test."""
    db_status = "unknown"
    try:
        db: Client = get_db(settings)
        # Simple connectivity check
        db.table("notes").select("id").limit(1).execute()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        database=db_status,
    )
