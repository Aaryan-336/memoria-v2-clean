"""
Memoria AI — JWT Authentication Middleware

Validates Supabase JWTs on protected endpoints.
Supports both ES256 (asymmetric JWKS) and HS256 (symmetric secret) verification.
"""

import ssl
from typing import Any, Optional

import httpx
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

# HTTPBearer extracts the token from the Authorization header
_security = HTTPBearer(auto_error=False)

# In-memory cache for JWKS keys to avoid making HTTP requests on every API call
_jwks_cache: dict[str, Any] = {}


class AuthUser:
    """Represents an authenticated user extracted from a JWT."""

    def __init__(self, user_id: str, email: str, role: str = "authenticated"):
        self.user_id = user_id
        self.email = email
        self.role = role

    def __repr__(self) -> str:
        return f"AuthUser(user_id={self.user_id!r}, email={self.email!r})"


def get_jwk_by_kid(supabase_url: str, kid: str) -> Optional[dict]:
    """Retrieve public keys from the Supabase JWKS endpoint and cache them."""
    global _jwks_cache
    if kid in _jwks_cache:
        return _jwks_cache[kid]

    try:
        base_url = supabase_url.rstrip("/")
        if base_url.endswith("/rest/v1"):
            base_url = base_url[:-8]
        jwks_url = f"{base_url}/auth/v1/.well-known/jwks.json"

        # Attempt standard fetch, fallback to bypassing SSL check if local certificates are outdated
        try:
            response = httpx.get(jwks_url, timeout=5.0)
        except (ssl.SSLError, Exception):
            response = httpx.get(jwks_url, verify=False, timeout=5.0)

        if response.status_code == 200:
            jwks = response.json()
            for key in jwks.get("keys", []):
                key_id = key.get("kid")
                if key_id:
                    _jwks_cache[key_id] = key

            return _jwks_cache.get(kid)
    except Exception as e:
        print(f"Error fetching JWKS keys: {e}")

    return None


def verify_token(
    supabase_url: str,
    jwt_secret: str,
    credentials: HTTPAuthorizationCredentials | None = Security(_security),
) -> AuthUser:
    """
    Verify a Supabase JWT and return the authenticated user.

    Supports both ES256 (JWKS) and HS256 local verification.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Determine the algorithm from JWT header without verification
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        kid = header.get("kid")

        if alg == "ES256" and kid:
            # Asymmetric signature verification using the public JWK key
            jwk = get_jwk_by_kid(supabase_url, kid)
            if not jwk:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not retrieve Supabase public key for token verification.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            payload = jwt.decode(
                token,
                jwk,
                algorithms=["ES256"],
                audience="authenticated",
            )
        else:
            # Fallback to symmetric key signature validation
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user info from JWT claims
    user_id = payload.get("sub")
    email = payload.get("email", "")
    role = payload.get("role", "authenticated")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim (user ID).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthUser(user_id=user_id, email=email, role=role)
