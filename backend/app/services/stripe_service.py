"""
Memoria AI — Stripe Integration Service

Handles Stripe Checkout, Customer Portal, and webhook signature verification.
All Stripe API calls are centralized here.
"""

from typing import Optional

import stripe
from fastapi import HTTPException

from app.config import get_settings


def _init_stripe() -> None:
    """Initialize the Stripe SDK with the secret key."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise RuntimeError(
            "STRIPE_SECRET_KEY is not configured. "
            "Set it in backend/.env to enable payments."
        )
    stripe.api_key = settings.stripe_secret_key


def _get_price_id(plan: str, interval: str) -> str:
    """Map a plan name + interval to a Stripe Price ID."""
    settings = get_settings()
    price_map = {
        ("pro", "monthly"): settings.stripe_price_pro_monthly,
        ("pro", "yearly"): settings.stripe_price_pro_yearly,
        ("premium", "monthly"): settings.stripe_price_premium_monthly,
        ("premium", "yearly"): settings.stripe_price_premium_yearly,
        ("team", "monthly"): settings.stripe_price_team_monthly,
        ("team", "yearly"): settings.stripe_price_team_yearly,
    }
    price_id = price_map.get((plan, interval))
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"No Stripe price configured for plan='{plan}', interval='{interval}'.",
        )
    return price_id


def create_checkout_session(
    user_id: str,
    email: str,
    plan: str,
    interval: str,
    stripe_customer_id: Optional[str] = None,
) -> str:
    """
    Create a Stripe Checkout Session and return the URL.

    If the user already has a Stripe customer ID, it's reused.
    Otherwise, Stripe creates a new customer from the email.
    """
    _init_stripe()
    settings = get_settings()
    price_id = _get_price_id(plan, interval)

    session_params: dict = {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{settings.frontend_url}/settings/billing?success=true",
        "cancel_url": f"{settings.frontend_url}/pricing?canceled=true",
        "metadata": {
            "user_id": user_id,
            "plan": plan,
            "interval": interval,
        },
        "subscription_data": {
            "metadata": {
                "user_id": user_id,
                "plan": plan,
            },
        },
    }

    if stripe_customer_id:
        session_params["customer"] = stripe_customer_id
    else:
        session_params["customer_email"] = email

    try:
        session = stripe.checkout.Session.create(**session_params)
        return session.url
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


def create_portal_session(stripe_customer_id: str) -> str:
    """
    Create a Stripe Customer Portal session for self-service billing.

    Returns the portal URL.
    """
    _init_stripe()
    settings = get_settings()

    if not stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail="No Stripe customer record found. Please subscribe first.",
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{settings.frontend_url}/settings/billing",
        )
        return session.url
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


def cancel_subscription(stripe_subscription_id: str) -> dict:
    """Cancel a Stripe subscription at period end."""
    _init_stripe()

    if not stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="No active subscription found to cancel.",
        )

    try:
        sub = stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=True,
        )
        return {"status": sub.status, "cancel_at_period_end": sub.cancel_at_period_end}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


def resume_subscription(stripe_subscription_id: str) -> dict:
    """Resume a subscription that was set to cancel at period end."""
    _init_stripe()

    if not stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="No subscription found to resume.",
        )

    try:
        sub = stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=False,
        )
        return {"status": sub.status, "cancel_at_period_end": sub.cancel_at_period_end}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


def change_subscription_plan(
    stripe_subscription_id: str,
    new_plan: str,
    new_interval: str,
) -> dict:
    """
    Change a subscription to a different plan/interval.

    Uses Stripe's proration to handle mid-cycle changes.
    """
    _init_stripe()

    if not stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="No active subscription found to change.",
        )

    new_price_id = _get_price_id(new_plan, new_interval)

    try:
        # Get current subscription to find the item ID
        sub = stripe.Subscription.retrieve(stripe_subscription_id)
        if not sub.get("items", {}).get("data"):
            raise HTTPException(status_code=400, detail="Subscription has no items.")

        item_id = sub["items"]["data"][0]["id"]

        updated_sub = stripe.Subscription.modify(
            stripe_subscription_id,
            items=[{"id": item_id, "price": new_price_id}],
            proration_behavior="create_prorations",
            metadata={"plan": new_plan},
        )
        return {
            "status": updated_sub.status,
            "plan": new_plan,
            "interval": new_interval,
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """
    Verify and parse a Stripe webhook event.

    Returns the parsed event object.
    """
    settings = get_settings()

    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=500,
            detail="Stripe webhook secret not configured.",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.stripe_webhook_secret,
        )
        return event
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")
