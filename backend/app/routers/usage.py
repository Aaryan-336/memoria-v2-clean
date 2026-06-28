"""
Memoria AI — Usage Router

Endpoints for retrieving usage stats, limits, and history.
"""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DatabaseDep
from app.middleware.subscription import SubscriptionDep
from app.models.schemas import (
    UsageHistoryItem,
    UsageHistoryResponse,
    UsageLimitsResponse,
    UsageResponse,
    PlanResponse,
)
from app.services.subscription_service import get_user_memories_count, resolve_user_plan
from app.services.usage_service import get_usage_from_db

router = APIRouter(prefix="/api", tags=["usage"])


@router.get("/usage", response_model=UsageResponse)
async def get_current_usage(
    current_user: CurrentUser,
    sub: SubscriptionDep,
):
    """Get today's usage counters for the authenticated user."""
    return UsageResponse(
        ai_queries=sub.usage_today.get("ai_queries", 0),
        youtube_imports=sub.usage_today.get("youtube_imports", 0),
        notes_created=sub.usage_today.get("notes_created", 0),
        flashcards_generated=sub.usage_today.get("flashcards_generated", 0),
        quizzes_generated=sub.usage_today.get("quizzes_generated", 0),
    )


@router.get("/usage/limits", response_model=UsageLimitsResponse)
async def get_usage_limits(
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
):
    """Get usage compared against the current plan's limits."""
    plan = resolve_user_plan(db, current_user.user_id)
    memories_count = get_user_memories_count(db, current_user.user_id)

    return UsageLimitsResponse(
        usage=UsageResponse(
            ai_queries=sub.usage_today.get("ai_queries", 0),
            youtube_imports=sub.usage_today.get("youtube_imports", 0),
            notes_created=sub.usage_today.get("notes_created", 0),
            flashcards_generated=sub.usage_today.get("flashcards_generated", 0),
            quizzes_generated=sub.usage_today.get("quizzes_generated", 0),
        ),
        limits=PlanResponse(
            id=plan["id"],
            name=plan["name"],
            display_name=plan["display_name"],
            description=plan.get("description"),
            price_monthly=plan["price_monthly"],
            price_yearly=plan["price_yearly"],
            max_memories=plan.get("max_memories"),
            max_storage_mb=plan.get("max_storage_mb"),
            max_ai_queries_daily=plan.get("max_ai_queries_daily"),
            max_workspaces=plan.get("max_workspaces"),
            max_youtube_daily=plan.get("max_youtube_daily"),
            features=plan.get("features", {}),
            sort_order=plan.get("sort_order", 0),
        ),
        memories_count=memories_count,
    )


@router.get("/usage/history", response_model=UsageHistoryResponse)
async def get_usage_history(
    current_user: CurrentUser,
    db: DatabaseDep,
    days: int = 30,
):
    """Get usage history for the last N days (default 30)."""
    if days < 1 or days > 90:
        days = 30

    history_data = get_usage_from_db(db, current_user.user_id, days)

    return UsageHistoryResponse(
        history=[
            UsageHistoryItem(
                date=row.get("usage_date", ""),
                ai_queries=row.get("ai_queries", 0),
                youtube_imports=row.get("youtube_imports", 0),
                notes_created=row.get("notes_created", 0),
            )
            for row in history_data
        ]
    )
