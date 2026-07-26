"""
Kognit Backend — Clerk JWT verification

Uses python-jose to verify Clerk session tokens.
JWKS is fetched once per process and cached — SSL verification is
disabled to work on corporate networks with SSL inspection (Zscaler etc).
"""

from __future__ import annotations

import os
import json
import time
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer(auto_error=False)

_SSL_VERIFY = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

# JWKS cache: {url -> (keys, fetched_at)}
_jwks_cache: dict[str, tuple[list, float]] = {}
_JWKS_TTL = 3600  # re-fetch at most once per hour


def _fetch_jwks(jwks_url: str) -> list:
    """Fetch JWKS from Clerk, cached per URL for 1 hour."""
    now = time.time()
    cached = _jwks_cache.get(jwks_url)
    if cached and (now - cached[1]) < _JWKS_TTL:
        return cached[0]

    resp = httpx.get(jwks_url, verify=_SSL_VERIFY, timeout=8)
    resp.raise_for_status()
    keys = resp.json()["keys"]
    _jwks_cache[jwks_url] = (keys, now)
    return keys


def verify_clerk_token(token: str) -> str:
    """
    Verify a Clerk JWT and return the user's Clerk subject (user_id).
    Raises HTTPException(401) on any failure.
    """
    try:
        # Decode unverified to get issuer + key ID
        unverified_claims = jwt.get_unverified_claims(token)
        issuer = unverified_claims.get("iss")
        if not issuer:
            raise ValueError("Token has no issuer claim")

        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        jwks_url = f"{issuer}/.well-known/jwks.json"
        keys = _fetch_jwks(jwks_url)

        # Find the matching key by kid
        rsa_key = next(
            (
                {"kty": k["kty"], "kid": k["kid"], "use": k["use"], "n": k["n"], "e": k["e"]}
                for k in keys
                if k.get("kid") == kid
            ),
            None,
        )

        if not rsa_key:
            # Force-refresh cache once if key not found (rotation edge case)
            _jwks_cache.pop(jwks_url, None)
            keys = _fetch_jwks(jwks_url)
            rsa_key = next(
                (
                    {"kty": k["kty"], "kid": k["kid"], "use": k["use"], "n": k["n"], "e": k["e"]}
                    for k in keys
                    if k.get("kid") == kid
                ),
                None,
            )

        if not rsa_key:
            raise ValueError("Signing key not found in JWKS")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            issuer=issuer,
        )
        return payload["sub"]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {e}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_clerk_token(credentials.credentials)


def get_current_user_ws(token: str) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    return verify_clerk_token(token)
