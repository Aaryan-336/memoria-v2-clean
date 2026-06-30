"""
Memoria AI — Application Configuration

Centralized settings using Pydantic BaseSettings.
All environment variables are validated at startup.
"""

from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Anthropic (Claude) ──────────────────────────────────
    anthropic_api_key: str = ""

    # ── Groq (Testing / Fast inference) ─────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ai_provider: str = "anthropic"  # "anthropic" or "groq"

    # ── Supabase ────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # ── Stripe ──────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro_monthly: str = ""
    stripe_price_pro_yearly: str = ""
    stripe_price_premium_monthly: str = ""
    stripe_price_premium_yearly: str = ""
    stripe_price_team_monthly: str = ""
    stripe_price_team_yearly: str = ""

    # ── Redis ───────────────────────────────────────────────
    redis_url: str = ""

    # ── YouTube Proxy (to bypass cloud IP blocks) ──────────
    youtube_proxy_url: str = ""

    # ── App URLs ────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"

    # ── CORS ────────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # ── App ─────────────────────────────────────────────────
    app_name: str = "Memoria AI"
    debug: bool = False

    @model_validator(mode="after")
    def add_frontend_url_to_cors(self) -> "Settings":
        if self.frontend_url and self.frontend_url not in self.cors_origins:
            self.cors_origins = self.cors_origins + [self.frontend_url]
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — loaded once at startup."""
    return Settings()

