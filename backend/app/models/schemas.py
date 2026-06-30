"""
Memoria AI — Pydantic Request/Response Schemas

All API request and response models. Moved from main.py.
user_id is no longer in request bodies — it comes from the JWT.
"""

from pydantic import BaseModel


# ── Requests ─────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    """Request to generate notes from a transcript."""
    transcript: str
    session_id: str = "default"
    note_format: str = "bullet"
    source_type: str = "manual"
    workspace_id: str | None = None


class YouTubeRequest(BaseModel):
    """Request to process a YouTube video."""
    url: str
    workspace_id: str | None = None
    transcript: str | None = None  # Pre-fetched transcript from frontend (Vercel)


class AskRequest(BaseModel):
    """Request to ask a question about notes."""
    question: str
    session_context: str = ""
    workspace_id: str | None = None


# ── Responses ────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    database: str = "unknown"


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str


# ── Flashcards ───────────────────────────────────────────────

class FlashcardItem(BaseModel):
    """A single flashcard returned by the AI."""
    topic: str
    content: str
    difficulty: str = "medium"


class GenerateFlashcardsRequest(BaseModel):
    """Request to generate flashcards for a note."""
    note_id: str


# ── Quiz ─────────────────────────────────────────────────────

class QuizQuestion(BaseModel):
    """A single quiz question returned by the AI."""
    question: str
    options: list[str]
    correct_answer: str
    explanation: str = ""


class GenerateQuizRequest(BaseModel):
    """Request to generate a quiz for a note."""
    note_id: str
    num_questions: int = 10


# ── Subscription Plans ───────────────────────────────────────

class PlanResponse(BaseModel):
    """A subscription plan returned to the client."""
    id: str
    name: str
    display_name: str
    description: str | None = None
    price_monthly: int
    price_yearly: int
    max_memories: int | None = None
    max_storage_mb: int | None = None
    max_ai_queries_daily: int | None = None
    max_workspaces: int | None = None
    max_youtube_daily: int | None = None
    features: dict
    sort_order: int = 0


class PlanListResponse(BaseModel):
    """List of available plans."""
    plans: list[PlanResponse]


# ── User Subscription ───────────────────────────────────────

class UserSubscriptionResponse(BaseModel):
    """Current user's subscription state."""
    plan: PlanResponse
    status: str
    billing_interval: str
    current_period_start: str
    current_period_end: str
    trial_end: str | None = None
    canceled_at: str | None = None
    student_discount: bool = False


# ── Usage ────────────────────────────────────────────────────

class UsageResponse(BaseModel):
    """Current day's usage counters."""
    ai_queries: int = 0
    youtube_imports: int = 0
    notes_created: int = 0
    flashcards_generated: int = 0
    quizzes_generated: int = 0
    storage_used_mb: float = 0


class UsageLimitsResponse(BaseModel):
    """Usage compared against plan limits."""
    usage: UsageResponse
    limits: PlanResponse
    memories_count: int = 0


class UsageHistoryItem(BaseModel):
    """A single day's usage."""
    date: str
    ai_queries: int = 0
    youtube_imports: int = 0
    notes_created: int = 0


class UsageHistoryResponse(BaseModel):
    """Usage history over a date range."""
    history: list[UsageHistoryItem]


# ── Billing ──────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    plan: str
    interval: str = "monthly"


class CheckoutResponse(BaseModel):
    """Stripe checkout session URL."""
    checkout_url: str


class PortalResponse(BaseModel):
    """Stripe customer portal URL."""
    portal_url: str


class ChangePlanRequest(BaseModel):
    """Request to change subscription plan."""
    plan: str
    interval: str = "monthly"


class PaymentHistoryItem(BaseModel):
    """A single payment record."""
    id: str
    amount: int
    currency: str
    status: str
    description: str | None = None
    created_at: str


class PaymentHistoryResponse(BaseModel):
    """List of payment records."""
    payments: list[PaymentHistoryItem]


# ── Workspaces ───────────────────────────────────────────────

class WorkspaceCreateRequest(BaseModel):
    """Request to create a workspace."""
    name: str


class WorkspaceInviteRequest(BaseModel):
    """Request to invite a member to a workspace."""
    email: str
    role: str = "viewer"


class WorkspaceMemberResponse(BaseModel):
    """Response detailing a workspace member."""
    id: str
    workspace_id: str
    user_id: str
    user_email: str | None = None
    role: str
    created_at: str


class WorkspaceResponse(BaseModel):
    """Response detailing a workspace."""
    id: str
    name: str
    owner_id: str
    created_at: str
    updated_at: str


class WorkspaceListResponse(BaseModel):
    """List of workspaces."""
    workspaces: list[WorkspaceResponse]


class MoveNoteRequest(BaseModel):
    """Request to move a note to a different workspace."""
    workspace_id: str | None = None

