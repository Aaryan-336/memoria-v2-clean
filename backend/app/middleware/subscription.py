"""
Memoria AI — Subscription Gating Middleware

FastAPI dependencies for:
- Resolving the user's current plan + usage (SubscriptionDep)
- Checking feature access (require_feature)
- Enforcing daily quotas (check_daily_quota)
"""

from dataclasses import dataclass, field
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status

from app.dependencies import CurrentUser, DatabaseDep
from app.services.subscription_service import (
    get_feature_overrides,
    resolve_user_plan,
)
from app.services.usage_service import get_all_usage


@dataclass
class SubscriptionContext:
    """Resolved subscription context for the current request."""

    user_id: str
    plan_name: str
    plan_display_name: str
    features: dict = field(default_factory=dict)
    limits: dict = field(default_factory=dict)
    usage_today: dict = field(default_factory=dict)
    overrides: dict = field(default_factory=dict)

    def has_feature(self, feature_key: str) -> bool:
        """Check if the user has access to a feature (plan or override)."""
        # Overrides take priority
        if feature_key in self.overrides:
            return self.overrides[feature_key]
        return self.features.get(feature_key, False)

    def get_limit(self, limit_key: str) -> Optional[int]:
        """Get a quota limit. Returns None for unlimited."""
        return self.limits.get(limit_key)

    def get_usage(self, metric: str) -> int:
        """Get today's usage count for a metric."""
        return self.usage_today.get(metric, 0)

    def is_under_quota(self, metric: str, limit_key: str) -> bool:
        """Check if the user is under their daily quota."""
        limit = self.get_limit(limit_key)
        if limit is None:
            return True  # Unlimited
        return self.get_usage(metric) < limit


def get_subscription_context(
    current_user: CurrentUser,
    db: DatabaseDep,
) -> SubscriptionContext:
    """
    FastAPI dependency that resolves the user's subscription context.

    This loads the user's plan, limits, features, daily usage, and overrides
    in a single dependency that can be injected into any endpoint.
    """
    plan = resolve_user_plan(db, current_user.user_id)
    overrides = get_feature_overrides(db, current_user.user_id)
    usage_today = get_all_usage(current_user.user_id)

    return SubscriptionContext(
        user_id=current_user.user_id,
        plan_name=plan.get("name", "free"),
        plan_display_name=plan.get("display_name", "Explorer"),
        features=plan.get("features", {}),
        limits={
            "max_ai_queries_daily": plan.get("max_ai_queries_daily"),
            "max_youtube_daily": plan.get("max_youtube_daily"),
            "max_memories": plan.get("max_memories"),
            "max_storage_mb": plan.get("max_storage_mb"),
            "max_workspaces": plan.get("max_workspaces"),
        },
        usage_today=usage_today,
        overrides=overrides,
    )


SubscriptionDep = Annotated[SubscriptionContext, Depends(get_subscription_context)]


def check_daily_quota(sub: SubscriptionContext, metric: str, limit_key: str) -> None:
    """
    Raise HTTP 429 if the user has exceeded their daily quota.

    Call this at the start of quota-limited endpoints.
    """
    if not sub.is_under_quota(metric, limit_key):
        limit = sub.get_limit(limit_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "quota_exceeded",
                "message": f"You've reached your daily limit of {limit} for this feature.",
                "metric": metric,
                "limit": limit,
                "current": sub.get_usage(metric),
                "plan": sub.plan_name,
                "upgrade_url": "/pricing",
            },
        )


def check_feature_access(sub: SubscriptionContext, feature_key: str) -> None:
    """
    Raise HTTP 403 if the user doesn't have access to a feature.

    Call this at the start of feature-gated endpoints.
    """
    if not sub.has_feature(feature_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "feature_locked",
                "message": f"This feature requires a higher plan.",
                "feature": feature_key,
                "plan": sub.plan_name,
                "upgrade_url": "/pricing",
            },
        )


def check_memory_limit(
    sub: SubscriptionContext, current_count: int
) -> None:
    """
    Raise HTTP 403 if the user has reached their memory (note) limit.

    Call this before creating a new note.
    """
    limit = sub.get_limit("max_memories")
    if limit is not None and current_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "memory_limit_reached",
                "message": f"You've reached your limit of {limit} memories. Upgrade to store more.",
                "current": current_count,
                "limit": limit,
                "plan": sub.plan_name,
                "upgrade_url": "/pricing",
            },
        )
