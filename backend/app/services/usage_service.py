"""
Memoria AI — Usage Tracking Service

Redis-backed real-time usage counters with daily TTL.
Falls back to direct DB queries if Redis is unavailable.
Counters are periodically flushed to the usage_daily table.
"""

from datetime import date, timedelta
from typing import Optional

import redis
from supabase import Client

from app.config import get_settings


def _get_redis() -> Optional[redis.Redis]:
    """Create a Redis connection. Returns None if Redis is not configured."""
    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        return redis.from_url(settings.redis_url, decode_responses=True)
    except Exception:
        return None


def _redis_key(user_id: str, metric: str, usage_date: Optional[date] = None) -> str:
    """Build the Redis key for a usage counter."""
    d = (usage_date or date.today()).isoformat()
    return f"usage:{user_id}:{d}:{metric}"


def increment_usage(user_id: str, metric: str) -> int:
    """
    Increment a usage counter and return the new value.

    Uses Redis INCR with a daily TTL for real-time counting.
    Falls back to returning 0 if Redis is unavailable
    (the DB will be updated via direct insert in the router).
    """
    r = _get_redis()
    if r is None:
        return 0

    key = _redis_key(user_id, metric)
    try:
        new_val = r.incr(key)
        # Set TTL to 48 hours on first increment (covers timezone edge cases)
        if new_val == 1:
            r.expire(key, 48 * 3600)
        return new_val
    except Exception:
        return 0


def get_usage(user_id: str, metric: str) -> int:
    """Get the current counter value from Redis."""
    r = _get_redis()
    if r is None:
        return 0

    key = _redis_key(user_id, metric)
    try:
        val = r.get(key)
        return int(val) if val else 0
    except Exception:
        return 0


def get_all_usage(user_id: str) -> dict[str, int]:
    """Get all usage counters for a user for today."""
    metrics = [
        "ai_queries",
        "youtube_imports",
        "notes_created",
        "flashcards_generated",
        "quizzes_generated",
    ]
    result = {}
    for metric in metrics:
        result[metric] = get_usage(user_id, metric)
    return result


def check_quota(user_id: str, metric: str, limit: Optional[int]) -> bool:
    """
    Return True if the user is under their quota.

    A None limit means unlimited (always returns True).
    """
    if limit is None:
        return True
    current = get_usage(user_id, metric)
    return current < limit


def track_usage_to_db(db: Client, user_id: str, metric: str) -> None:
    """
    Record a usage increment in the PostgreSQL usage_daily table.

    Uses upsert to create or increment the daily row.
    """
    today = date.today().isoformat()
    try:
        # Try to get existing row
        existing = (
            db.table("usage_daily")
            .select("id", metric)
            .eq("user_id", user_id)
            .eq("usage_date", today)
            .execute()
        )

        if existing.data:
            row = existing.data[0]
            current_val = row.get(metric, 0)
            db.table("usage_daily").update({
                metric: current_val + 1,
                "updated_at": "now()",
            }).eq("id", row["id"]).execute()
        else:
            db.table("usage_daily").insert({
                "user_id": user_id,
                "usage_date": today,
                metric: 1,
            }).execute()
    except Exception as e:
        # Usage tracking should never block the main request
        print(f"Warning: failed to track usage in DB: {e}")


def log_usage_event(
    db: Client, user_id: str, event_type: str, metadata: Optional[dict] = None
) -> None:
    """Log a granular usage event for analytics."""
    try:
        db.table("usage_events").insert({
            "user_id": user_id,
            "event_type": event_type,
            "metadata": metadata or {},
        }).execute()
    except Exception as e:
        print(f"Warning: failed to log usage event: {e}")


def get_usage_from_db(db: Client, user_id: str, days: int = 30) -> list[dict]:
    """Get usage history from the database for the last N days."""
    start_date = (date.today() - timedelta(days=days)).isoformat()
    try:
        result = (
            db.table("usage_daily")
            .select("*")
            .eq("user_id", user_id)
            .gte("usage_date", start_date)
            .order("usage_date", desc=True)
            .execute()
        )
        return result.data
    except Exception:
        return []
