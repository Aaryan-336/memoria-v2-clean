"""
Memoria AI — Billing Router

Endpoints for payment history and invoice access.
"""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DatabaseDep
from app.models.schemas import PaymentHistoryItem, PaymentHistoryResponse
from app.services.subscription_service import get_payment_history

router = APIRouter(prefix="/api", tags=["billing"])


@router.get("/billing/history", response_model=PaymentHistoryResponse)
async def get_billing_history(
    current_user: CurrentUser,
    db: DatabaseDep,
):
    """Get payment history for the authenticated user."""
    payments = get_payment_history(db, current_user.user_id)

    return PaymentHistoryResponse(
        payments=[
            PaymentHistoryItem(
                id=p["id"],
                amount=p["amount"],
                currency=p["currency"],
                status=p["status"],
                description=p.get("description"),
                created_at=p["created_at"],
            )
            for p in payments
        ]
    )
