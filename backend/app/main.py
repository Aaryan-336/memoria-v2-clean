"""
Memoria AI — FastAPI Application

Main application factory. Configures CORS, mounts routers.
Entry point: uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, notes, youtube, ask, search, flashcards, quiz
from app.routers import subscriptions, usage, webhooks, billing, workspaces, upload


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        description="AI-powered Lecture Intelligence Platform",
        version="2.0.0",
    )

    # ── CORS ─────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex="https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────────
    application.include_router(health.router)
    application.include_router(notes.router)
    application.include_router(youtube.router)
    application.include_router(upload.router)
    application.include_router(ask.router)
    application.include_router(search.router)
    application.include_router(flashcards.router)
    application.include_router(quiz.router)

    # ── Subscription, Billing & Workspaces ───────────────────
    application.include_router(subscriptions.router)
    application.include_router(usage.router)
    application.include_router(webhooks.router)
    application.include_router(billing.router)
    application.include_router(workspaces.router)

    return application


app = create_app()
