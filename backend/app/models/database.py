"""
Memoria AI — Supabase Database Client

Factory function for creating the Supabase client.
Moved from database.py with dependency injection support.
"""

from supabase import create_client, Client
from app.config import Settings


def get_supabase_client(settings: Settings) -> Client:
    """Create a Supabase client from settings."""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)
