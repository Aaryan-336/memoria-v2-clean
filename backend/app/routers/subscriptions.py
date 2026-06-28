"""
Memoria AI — Subscriptions Router

Endpoints for plan management, checkout, billing portal,
and subscription lifecycle (cancel, resume, change plan).
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.models.schemas import (
    CheckoutRequest,
    CheckoutResponse,
    ChangePlanRequest,
    PlanListResponse,
    PlanResponse,
    PortalResponse,
    UserSubscriptionResponse,
)
from app.services.subscription_service import (
    get_all_plans,
    get_user_subscription,
    resolve_user_plan,
    create_subscription,
)
from app.services.stripe_service import (
    cancel_subscription,
    change_subscription_plan,
    create_checkout_session,
    create_portal_session,
    resume_subscription,
)

router = APIRouter(prefix="/api", tags=["subscriptions"])


@router.get("/plans", response_model=PlanListResponse)
async def list_plans(db: DatabaseDep):
    """List all available subscription plans. Public endpoint."""
    plans = get_all_plans(db)
    return {
        "plans": [
            PlanResponse(
                id=p["id"],
                name=p["name"],
                display_name=p["display_name"],
                description=p.get("description"),
                price_monthly=p["price_monthly"],
                price_yearly=p["price_yearly"],
                max_memories=p.get("max_memories"),
                max_storage_mb=p.get("max_storage_mb"),
                max_ai_queries_daily=p.get("max_ai_queries_daily"),
                max_workspaces=p.get("max_workspaces"),
                max_youtube_daily=p.get("max_youtube_daily"),
                features=p.get("features", {}),
                sort_order=p.get("sort_order", 0),
            )
            for p in plans
        ]
    }


@router.get("/subscription", response_model=UserSubscriptionResponse)
async def get_current_subscription(
    current_user: CurrentUser,
    db: DatabaseDep,
):
    """Get the current user's subscription state."""
    plan = resolve_user_plan(db, current_user.user_id)
    subscription = get_user_subscription(db, current_user.user_id)

    return UserSubscriptionResponse(
        plan=PlanResponse(
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
        status=subscription.get("status") if subscription else "active",
        billing_interval=subscription.get("billing_interval") if subscription else "monthly",
        current_period_start=(
            subscription.get("current_period_start") if subscription else ""
        ),
        current_period_end=(
            subscription.get("current_period_end") if subscription else ""
        ),
        trial_end=subscription.get("trial_end") if subscription else None,
        canceled_at=subscription.get("canceled_at") if subscription else None,
        student_discount=(
            subscription.get("student_discount", False) if subscription else False
        ),
    )


@router.post("/subscription/checkout", response_model=CheckoutResponse)
async def create_checkout(
    req: CheckoutRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Create a Stripe Checkout session for subscribing to a plan."""
    if req.plan not in ("pro", "premium", "team"):
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'pro', 'premium', or 'team'.")
    if req.interval not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Invalid interval. Choose 'monthly' or 'yearly'.")

    # If Stripe is not configured, run in Mock Billing Mode (updates DB directly)
    if not settings.stripe_secret_key:
        create_subscription(
            db=db,
            user_id=current_user.user_id,
            plan_name=req.plan,
            stripe_customer_id="mock_customer_id",
            stripe_subscription_id="mock_sub_id",
            billing_interval=req.interval,
            status="active",
        )
        return CheckoutResponse(checkout_url=f"{settings.frontend_url}/settings/billing?success=true")

    # Check if user already has a Stripe customer ID
    subscription = get_user_subscription(db, current_user.user_id)
    stripe_customer_id = subscription.get("stripe_customer_id") if subscription else None

    checkout_url = create_checkout_session(
        user_id=current_user.user_id,
        email=current_user.email,
        plan=req.plan,
        interval=req.interval,
        stripe_customer_id=stripe_customer_id,
    )

    return CheckoutResponse(checkout_url=checkout_url)


@router.post("/subscription/portal", response_model=PortalResponse)
async def create_billing_portal(
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Create a Stripe Customer Portal session for self-service billing."""
    subscription = get_user_subscription(db, current_user.user_id)

    # Local Mock Billing mode
    if not settings.stripe_secret_key:
        return PortalResponse(portal_url=f"{settings.frontend_url}/settings/billing?mock_portal=true")

    if not subscription or not subscription.get("stripe_customer_id"):
        raise HTTPException(
            status_code=400,
            detail="No billing account found. Please subscribe to a plan first.",
        )

    portal_url = create_portal_session(subscription["stripe_customer_id"])
    return PortalResponse(portal_url=portal_url)


@router.post("/subscription/cancel")
async def cancel_user_subscription(
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Cancel the current subscription at period end."""
    subscription = get_user_subscription(db, current_user.user_id)
    if not subscription:
        raise HTTPException(status_code=400, detail="No active subscription to cancel.")

    # Local Mock Billing mode
    if not settings.stripe_secret_key:
        from datetime import datetime, timezone
        db.table("user_subscriptions").update({
            "status": "canceled",
            "canceled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", current_user.user_id).execute()
        return {"success": True, "status": "canceled", "cancel_at_period_end": True}

    if not subscription.get("stripe_subscription_id"):
        raise HTTPException(status_code=400, detail="No active Stripe subscription to cancel.")

    result = cancel_subscription(subscription["stripe_subscription_id"])
    return {"success": True, **result}


@router.post("/subscription/resume")
async def resume_user_subscription(
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Resume a subscription that was set to cancel at period end."""
    subscription = get_user_subscription(db, current_user.user_id)
    if not subscription:
        raise HTTPException(status_code=400, detail="No subscription to resume.")

    # Local Mock Billing mode
    if not settings.stripe_secret_key:
        from datetime import datetime, timezone
        db.table("user_subscriptions").update({
            "status": "active",
            "canceled_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", current_user.user_id).execute()
        return {"success": True, "status": "active", "cancel_at_period_end": False}

    if not subscription.get("stripe_subscription_id"):
        raise HTTPException(status_code=400, detail="No active Stripe subscription to resume.")

    result = resume_subscription(subscription["stripe_subscription_id"])
    return {"success": True, **result}


@router.put("/subscription/change-plan")
async def change_plan(
    req: ChangePlanRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Upgrade or downgrade to a different plan."""
    if req.plan not in ("pro", "premium", "team"):
        raise HTTPException(status_code=400, detail="Invalid plan.")
    if req.interval not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Invalid interval.")

    subscription = get_user_subscription(db, current_user.user_id)
    if not subscription:
        raise HTTPException(
            status_code=400,
            detail="No active subscription. Use checkout to subscribe first.",
        )

    # Local Mock Billing mode
    if not settings.stripe_secret_key:
        create_subscription(
            db=db,
            user_id=current_user.user_id,
            plan_name=req.plan,
            stripe_customer_id=subscription.get("stripe_customer_id") or "mock_customer_id",
            stripe_subscription_id=subscription.get("stripe_subscription_id") or "mock_sub_id",
            billing_interval=req.interval,
            status="active",
        )
        return {"success": True, "status": "active", "plan": req.plan, "interval": req.interval}

    if not subscription.get("stripe_subscription_id"):
        raise HTTPException(
            status_code=400,
            detail="No active Stripe subscription to change.",
        )

    result = change_subscription_plan(
        subscription["stripe_subscription_id"],
        req.plan,
        req.interval,
    )
    return {"success": True, **result}
