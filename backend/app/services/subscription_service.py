"""
Memoria AI — Subscription Business Logic Service

Resolves the user's active plan, handles plan lookups, and
manages the subscription lifecycle in the database.
"""

from datetime import datetime, timezone
from typing import Optional

from supabase import Client


# ── Constants ────────────────────────────────────────────────

# ── Fallback Plans ──────────────────────────────────────────
FALLBACK_PLANS = [
    {
        "id": "free-fallback",
        "name": "free",
        "display_name": "Explorer",
        "description": "Start your second brain journey",
        "price_monthly": 0,
        "price_yearly": 0,
        "max_memories": 100,
        "max_storage_mb": 500,
        "max_ai_queries_daily": 30,
        "max_workspaces": 1,
        "max_youtube_daily": 3,
        "features": {
            "basic_search": True,
            "text_notes": True,
            "pdf_upload": True,
            "basic_rag": True,
            "markdown_export": True,
            "audio_recording": True,
            "voice_transcription": True,
            "flashcards_per_note": 3,
            "quiz_questions_per_note": 5,
        },
        "sort_order": 0,
    },
    {
        "id": "pro-fallback",
        "name": "pro",
        "display_name": "Personal Knowledge System",
        "description": "Supercharge your learning",
        "price_monthly": 399,
        "price_yearly": 3192,
        "max_memories": 10000,
        "max_storage_mb": 10240,
        "max_ai_queries_daily": None,
        "max_workspaces": 5,
        "max_youtube_daily": None,
        "features": {
            "basic_search": True,
            "text_notes": True,
            "pdf_upload": True,
            "basic_rag": True,
            "markdown_export": True,
            "audio_recording": True,
            "voice_transcription": True,
            "youtube_unlimited": True,
            "ai_summaries": True,
            "smart_tags": True,
            "collections": True,
            "timeline_view": True,
            "daily_recap": True,
            "priority_indexing": True,
            "ppt_upload": True,
            "image_upload": True,
            "browser_extension": True,
            "memory_streaks": True,
            "ai_study_planner": True,
            "smart_reminders": True,
            "weekly_reports": True,
            "knowledge_analytics": True,
            "ai_memory_coach": True,
            "context_recommendations": True,
            "flashcards_per_note": None,
            "quiz_questions_per_note": None,
        },
        "sort_order": 1,
    },
    {
        "id": "premium-fallback",
        "name": "premium",
        "display_name": "AI Research Assistant",
        "description": "Your personal AI research team",
        "price_monthly": 1999,
        "price_yearly": 15992,
        "max_memories": None,
        "max_storage_mb": 102400,
        "max_ai_queries_daily": None,
        "max_workspaces": None,
        "max_youtube_daily": None,
        "features": {
            "basic_search": True,
            "text_notes": True,
            "pdf_upload": True,
            "basic_rag": True,
            "markdown_export": True,
            "audio_recording": True,
            "voice_transcription": True,
            "youtube_unlimited": True,
            "ai_summaries": True,
            "smart_tags": True,
            "collections": True,
            "timeline_view": True,
            "daily_recap": True,
            "priority_indexing": True,
            "ppt_upload": True,
            "image_upload": True,
            "browser_extension": True,
            "memory_streaks": True,
            "ai_study_planner": True,
            "smart_reminders": True,
            "weekly_reports": True,
            "knowledge_analytics": True,
            "ai_memory_coach": True,
            "context_recommendations": True,
            "multi_agent_reasoning": True,
            "deep_research": True,
            "cross_document_analysis": True,
            "ai_insights": True,
            "knowledge_gap_detection": True,
            "personal_ai_assistant": True,
            "custom_ai_personalities": True,
            "knowledge_graph": True,
            "automatic_organization": True,
            "memory_health_score": True,
            "knowledge_decay_detection": True,
            "scheduled_quizzes": True,
            "study_revision_mode": True,
            "learning_mode": True,
            "api_access": True,
            "long_term_retention": True,
            "ai_writing_assistant": True,
            "meeting_assistant": True,
            "smart_workflows": True,
            "email_ingestion": True,
            "memory_replay": True,
            "time_machine": True,
            "ai_memory_maps": True,
            "revision_scheduling": True,
            "mastery_score": True,
            "ai_goal_tracking": True,
            "flashcards_per_note": None,
            "quiz_questions_per_note": None,
        },
        "sort_order": 2,
    },
    {
        "id": "team-fallback",
        "name": "team",
        "display_name": "Collaborative Intelligence",
        "description": "Knowledge for your entire team",
        "price_monthly": 999,
        "price_yearly": 7992,
        "max_memories": None,
        "max_storage_mb": 102400,
        "max_ai_queries_daily": None,
        "max_workspaces": None,
        "max_youtube_daily": None,
        "features": {
            "basic_search": True,
            "text_notes": True,
            "pdf_upload": True,
            "basic_rag": True,
            "markdown_export": True,
            "audio_recording": True,
            "voice_transcription": True,
            "youtube_unlimited": True,
            "ai_summaries": True,
            "smart_tags": True,
            "collections": True,
            "timeline_view": True,
            "daily_recap": True,
            "priority_indexing": True,
            "ppt_upload": True,
            "image_upload": True,
            "browser_extension": True,
            "memory_streaks": True,
            "ai_study_planner": True,
            "smart_reminders": True,
            "weekly_reports": True,
            "knowledge_analytics": True,
            "ai_memory_coach": True,
            "context_recommendations": True,
            "multi_agent_reasoning": True,
            "deep_research": True,
            "cross_document_analysis": True,
            "ai_insights": True,
            "knowledge_gap_detection": True,
            "personal_ai_assistant": True,
            "custom_ai_personalities": True,
            "knowledge_graph": True,
            "automatic_organization": True,
            "shared_workspaces": True,
            "rbac": True,
            "team_knowledge_base": True,
            "activity_logs": True,
            "workspace_analytics": True,
            "collaborative_collections": True,
            "shared_memory_graph": True,
            "org_search": True,
            "flashcards_per_note": None,
            "quiz_questions_per_note": None,
        },
        "sort_order": 3,
    }
]

FREE_PLAN_NAME = "free"

# Cache plans in-memory (they rarely change)
_plans_cache: Optional[list[dict]] = None


def get_all_plans(db: Client) -> list[dict]:
    """Get all active subscription plans, ordered by sort_order."""
    global _plans_cache
    if _plans_cache is not None:
        return _plans_cache

    try:
        result = (
            db.table("subscription_plans")
            .select("*")
            .eq("is_active", True)
            .order("sort_order")
            .execute()
        )
        _plans_cache = result.data
        return _plans_cache
    except Exception as e:
        print(f"Database error querying subscription_plans: {e}. Falling back to default list.")
        return FALLBACK_PLANS


def get_plan_by_name(db: Client, name: str) -> Optional[dict]:
    """Get a single plan by its name ('free', 'pro', 'premium', 'team')."""
    plans = get_all_plans(db)
    for plan in plans:
        if plan["name"] == name:
            return plan
    return None


def get_plan_by_id(db: Client, plan_id: str) -> Optional[dict]:
    """Get a single plan by its UUID."""
    plans = get_all_plans(db)
    for plan in plans:
        if plan["id"] == plan_id:
            return plan
    return None


# In-memory store for mock subscriptions when database is not fully initialized
_mock_subscriptions_store: dict[str, dict] = {}


def get_user_subscription(db: Client, user_id: str) -> Optional[dict]:
    """Get the user's active subscription record, or None if on free."""
    if user_id in _mock_subscriptions_store:
        return _mock_subscriptions_store[user_id]
        
    try:
        result = (
            db.table("user_subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        pass
    return None


def resolve_user_plan(db: Client, user_id: str) -> dict:
    """
    Resolve the user's effective plan.

    Returns the plan dict with all limits and features.
    If the user has no subscription or an expired one, returns the free plan.
    """
    subscription = get_user_subscription(db, user_id)

    if subscription and subscription.get("status") in ("active", "trialing"):
        plan = get_plan_by_id(db, subscription["plan_id"])
        if plan:
            return plan

    # Fallback to free plan
    free_plan = get_plan_by_name(db, FREE_PLAN_NAME)
    if free_plan:
        return free_plan

    # Ultimate fallback: return minimal free plan inline
    return {
        "id": "free-fallback",
        "name": "free",
        "display_name": "Explorer",
        "description": "Start your second brain journey",
        "price_monthly": 0,
        "price_yearly": 0,
        "max_memories": 100,
        "max_storage_mb": 500,
        "max_ai_queries_daily": 30,
        "max_workspaces": 1,
        "max_youtube_daily": 3,
        "features": {
            "basic_search": True,
            "text_notes": True,
            "pdf_upload": True,
            "basic_rag": True,
            "markdown_export": True,
            "audio_recording": True,
            "voice_transcription": True,
            "flashcards_per_note": 3,
            "quiz_questions_per_note": 5,
        },
        "sort_order": 0,
    }


def create_subscription(
    db: Client,
    user_id: str,
    plan_name: str,
    stripe_customer_id: str,
    stripe_subscription_id: str,
    billing_interval: str = "monthly",
    status: str = "active",
) -> dict:
    """
    Create or update a user's subscription record.

    Uses upsert on user_id to handle existing records.
    """
    plan = get_plan_by_name(db, plan_name)
    if not plan:
        raise ValueError(f"Unknown plan: {plan_name}")

    from datetime import datetime, timezone, timedelta
    now_dt = datetime.now(timezone.utc)
    if billing_interval == "yearly":
        end_dt = now_dt + timedelta(days=365)
    else:
        end_dt = now_dt + timedelta(days=30)
        
    now = now_dt.isoformat()
    period_end = end_dt.isoformat()

    sub_data = {
        "user_id": user_id,
        "plan_id": plan["id"],
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
        "billing_interval": billing_interval,
        "status": status,
        "current_period_start": now,
        "current_period_end": period_end,
        "updated_at": now,
        "plan": plan,  # Embed plan detail for schema mapping
    }

    # Always persist in-memory first for robust mock fallback
    _mock_subscriptions_store[user_id] = sub_data

    try:
        result = (
            db.table("user_subscriptions")
            .upsert({
                "user_id": user_id,
                "plan_id": plan["id"],
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "billing_interval": billing_interval,
                "status": status,
                "current_period_start": now,
                "current_period_end": period_end,
                "updated_at": now,
            }, on_conflict="user_id")
            .execute()
        )
        return result.data[0] if result.data else sub_data
    except Exception as e:
        print(f"Warning: could not write subscription to database (table might be missing): {e}")
        return sub_data


def update_subscription_status(
    db: Client,
    stripe_subscription_id: str,
    status: str,
    canceled_at: Optional[str] = None,
    current_period_end: Optional[str] = None,
) -> None:
    """Update subscription status from a Stripe webhook event."""
    try:
        update_data: dict = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if canceled_at:
            update_data["canceled_at"] = canceled_at
        if current_period_end:
            update_data["current_period_end"] = current_period_end

        db.table("user_subscriptions").update(
            update_data
        ).eq("stripe_subscription_id", stripe_subscription_id).execute()
    except Exception as e:
        print(f"Error updating subscription status: {e}")


def record_payment(
    db: Client,
    user_id: str,
    amount: int,
    currency: str,
    status: str,
    stripe_payment_intent_id: str = "",
    stripe_invoice_id: str = "",
    description: str = "",
) -> None:
    """Record a payment in the payment_history table."""
    try:
        # Find the user's subscription ID
        sub = get_user_subscription(db, user_id)
        sub_id = sub["id"] if sub else None

        db.table("payment_history").insert({
            "user_id": user_id,
            "subscription_id": sub_id,
            "stripe_payment_intent_id": stripe_payment_intent_id,
            "stripe_invoice_id": stripe_invoice_id,
            "amount": amount,
            "currency": currency,
            "status": status,
            "description": description,
        }).execute()
    except Exception as e:
        print(f"Error recording payment: {e}")


def get_payment_history(db: Client, user_id: str, limit: int = 20) -> list[dict]:
    """Get the user's payment history."""
    try:
        result = (
            db.table("payment_history")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    except Exception:
        return []


def get_user_memories_count(db: Client, user_id: str) -> int:
    """Get the total number of notes/memories for a user."""
    try:
        result = (
            db.table("notes")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        return result.count or 0
    except Exception:
        return 0


def get_feature_overrides(db: Client, user_id: str) -> dict[str, bool]:
    """Get any per-user feature overrides (e.g., beta tester access)."""
    try:
        result = (
            db.table("feature_overrides")
            .select("feature_key, enabled, expires_at")
            .eq("user_id", user_id)
            .execute()
        )
        overrides = {}
        now = datetime.now(timezone.utc)
        for row in result.data:
            # Skip expired overrides
            if row.get("expires_at"):
                try:
                    expires = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
                    if expires < now:
                        continue
                except (ValueError, TypeError):
                    pass
            overrides[row["feature_key"]] = row["enabled"]
        return overrides
    except Exception:
        return {}


def invalidate_plans_cache() -> None:
    """Clear the plans cache (call after admin updates plans)."""
    global _plans_cache
    _plans_cache = None


# ── Mock Workspaces Stores (Memory fallback for DB-less setups) ──
_mock_workspaces_store: list[dict] = []
_mock_workspace_members_store: list[dict] = []

def mock_create_workspace(name: str, owner_id: str) -> dict:
    import uuid
    from datetime import datetime, timezone
    w_id = str(uuid.uuid4())
    w_data = {
        "id": w_id,
        "name": name,
        "owner_id": owner_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    _mock_workspaces_store.append(w_data)
    
    m_data = {
        "id": str(uuid.uuid4()),
        "workspace_id": w_id,
        "user_id": owner_id,
        "role": "owner",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    _mock_workspace_members_store.append(m_data)
    return w_data

def mock_get_workspaces(user_id: str) -> list[dict]:
    joined_ids = [m["workspace_id"] for m in _mock_workspace_members_store if m["user_id"] == user_id]
    return [w for w in _mock_workspaces_store if w["id"] in joined_ids or w["owner_id"] == user_id]

def mock_invite_member(workspace_id: str, user_email: str, role: str, db: Client) -> dict:
    import uuid
    from datetime import datetime, timezone
    import hashlib
    
    # Consistent mock UUID based on email
    h = hashlib.md5(user_email.lower().strip().encode("utf-8")).hexdigest()
    user_id = str(uuid.UUID(h))
        
    m_data = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "user_id": user_id,
        "user_email": user_email.lower().strip(),
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    _mock_workspace_members_store.append(m_data)
    return m_data

def mock_get_workspace_members(workspace_id: str) -> list[dict]:
    return [m for m in _mock_workspace_members_store if m["workspace_id"] == workspace_id]
