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


class YouTubeRequest(BaseModel):
    """Request to process a YouTube video."""
    url: str


class AskRequest(BaseModel):
    """Request to ask a question about notes."""
    question: str
    session_context: str = ""


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
