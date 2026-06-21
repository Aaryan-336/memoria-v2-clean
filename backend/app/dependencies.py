"""
Memoria AI — Shared FastAPI Dependencies

Dependency injection for settings, database, and auth.
These are used across all routers via Depends().
"""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.config import Settings, get_settings
from app.middleware.auth import AuthUser, verify_token
from app.models.database import get_supabase_client

# ── Type aliases for dependency injection ────────────────────

SettingsDep = Annotated[Settings, Depends(get_settings)]

_security = HTTPBearer(auto_error=False)


@lru_cache
def _get_supabase(supabase_url: str, supabase_service_key: str) -> Client:
    """Cached Supabase client — created once per unique URL+key combo."""
    from app.config import Settings as S

    settings = S(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
    )
    return get_supabase_client(settings)


def get_db(settings: SettingsDep) -> Client:
    """Get the Supabase client as a FastAPI dependency."""
    return _get_supabase(settings.supabase_url, settings.supabase_service_key)


DatabaseDep = Annotated[Client, Depends(get_db)]


def get_current_user(
    settings: SettingsDep,
    credentials: HTTPAuthorizationCredentials | None = Security(_security),
) -> AuthUser:
    """
    FastAPI dependency that verifies the JWT and returns the current user.
    Use as: current_user: CurrentUser
    """
    return verify_token(settings.supabase_url, settings.supabase_jwt_secret, credentials)


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
