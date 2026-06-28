"""
Memoria AI — Stripe Webhooks Router

Handles incoming Stripe webhook events to keep subscription
state in sync with Stripe's payment lifecycle.

This endpoint does NOT require JWT authentication —
it uses Stripe's webhook signature verification instead.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.dependencies import DatabaseDep
from app.services.stripe_service import verify_webhook_signature
from app.services.subscription_service import (
    create_subscription,
    record_payment,
    update_subscription_status,
)

router = APIRouter(prefix="/api", tags=["webhooks"])


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: DatabaseDep,
):
    """
    Stripe webhook handler.

    Processes payment events and syncs subscription state.
    Verifies the webhook signature to ensure authenticity.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header.")

    event = verify_webhook_signature(payload, sig_header)
    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})

    try:
        if event_type == "checkout.session.completed":
            _handle_checkout_completed(db, data_object)

        elif event_type == "invoice.paid":
            _handle_invoice_paid(db, data_object)

        elif event_type == "invoice.payment_failed":
            _handle_payment_failed(db, data_object)

        elif event_type == "customer.subscription.updated":
            _handle_subscription_updated(db, data_object)

        elif event_type == "customer.subscription.deleted":
            _handle_subscription_deleted(db, data_object)

    except Exception as e:
        # Log the error but return 200 so Stripe doesn't retry endlessly
        print(f"Webhook processing error for {event_type}: {e}")

    # Always return 200 to acknowledge receipt
    return {"received": True}


def _handle_checkout_completed(db, session: dict) -> None:
    """Handle a completed checkout session — create the subscription record."""
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id")
    plan = metadata.get("plan", "pro")
    interval = metadata.get("interval", "monthly")

    if not user_id:
        print("Webhook: checkout.session.completed missing user_id in metadata")
        return

    stripe_customer_id = session.get("customer", "")
    stripe_subscription_id = session.get("subscription", "")

    create_subscription(
        db=db,
        user_id=user_id,
        plan_name=plan,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
        billing_interval=interval,
        status="active",
    )


def _handle_invoice_paid(db, invoice: dict) -> None:
    """Handle a paid invoice — record payment and update period end."""
    stripe_subscription_id = invoice.get("subscription", "")
    customer_id = invoice.get("customer", "")

    # Record payment
    amount = invoice.get("amount_paid", 0)
    currency = invoice.get("currency", "usd")

    # Find user_id from the subscription metadata or customer
    lines = invoice.get("lines", {}).get("data", [])
    user_id = ""
    for line in lines:
        meta = line.get("metadata", {})
        if meta.get("user_id"):
            user_id = meta["user_id"]
            break

    if not user_id:
        # Try from subscription metadata
        sub_meta = invoice.get("subscription_details", {}).get("metadata", {})
        user_id = sub_meta.get("user_id", "")

    if user_id:
        record_payment(
            db=db,
            user_id=user_id,
            amount=amount,
            currency=currency,
            status="succeeded",
            stripe_invoice_id=invoice.get("id", ""),
            stripe_payment_intent_id=invoice.get("payment_intent", ""),
            description=f"Subscription payment",
        )

    # Update period end
    period_end = invoice.get("lines", {}).get("data", [{}])[0].get("period", {}).get("end")
    if period_end and stripe_subscription_id:
        period_end_dt = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()
        update_subscription_status(
            db=db,
            stripe_subscription_id=stripe_subscription_id,
            status="active",
            current_period_end=period_end_dt,
        )


def _handle_payment_failed(db, invoice: dict) -> None:
    """Handle a failed payment — set subscription to past_due."""
    stripe_subscription_id = invoice.get("subscription", "")
    if stripe_subscription_id:
        update_subscription_status(
            db=db,
            stripe_subscription_id=stripe_subscription_id,
            status="past_due",
        )


def _handle_subscription_updated(db, subscription: dict) -> None:
    """Handle subscription updates (plan changes, status changes)."""
    stripe_subscription_id = subscription.get("id", "")
    status = subscription.get("status", "active")

    cancel_at_period_end = subscription.get("cancel_at_period_end", False)
    if cancel_at_period_end:
        status = "canceled"

    canceled_at = None
    if subscription.get("canceled_at"):
        canceled_at = datetime.fromtimestamp(
            subscription["canceled_at"], tz=timezone.utc
        ).isoformat()

    period_end = subscription.get("current_period_end")
    period_end_str = None
    if period_end:
        period_end_str = datetime.fromtimestamp(
            period_end, tz=timezone.utc
        ).isoformat()

    update_subscription_status(
        db=db,
        stripe_subscription_id=stripe_subscription_id,
        status=status,
        canceled_at=canceled_at,
        current_period_end=period_end_str,
    )


def _handle_subscription_deleted(db, subscription: dict) -> None:
    """Handle subscription deletion — downgrade to free."""
    stripe_subscription_id = subscription.get("id", "")
    if stripe_subscription_id:
        update_subscription_status(
            db=db,
            stripe_subscription_id=stripe_subscription_id,
            status="canceled",
            canceled_at=datetime.now(timezone.utc).isoformat(),
        )
