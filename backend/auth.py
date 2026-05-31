from __future__ import annotations

import logging

import httpx
import jwt
from fastapi import Header, HTTPException
from jwt.algorithms import ECAlgorithm, RSAAlgorithm

logger = logging.getLogger(__name__)

# In-memory JWKS cache keyed by issuer URL. Refreshed on key-not-found (key rotation).
_JWKS_CACHE: dict[str, list[dict]] = {}


async def _fetch_jwks(issuer: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{issuer}/.well-known/jwks.json")
        resp.raise_for_status()
    return resp.json()["keys"]


async def _get_jwks(issuer: str, *, invalidate: bool = False) -> list[dict]:
    if invalidate or issuer not in _JWKS_CACHE:
        _JWKS_CACHE[issuer] = await _fetch_jwks(issuer)
    return _JWKS_CACHE[issuer]


def _public_key_and_alg(jwk: dict):
    """Return (public_key, algorithm) from a JWK, supporting RSA and EC keys."""
    kty = jwk.get("kty", "RSA")
    if kty == "EC":
        return ECAlgorithm.from_jwk(jwk), "ES256"
    return RSAAlgorithm.from_jwk(jwk), "RS256"


async def verify_clerk_token(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency. Returns the Clerk user_id (sub claim) or raises 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        alg_hint = headers.get("alg", "RS256")

        unverified = jwt.decode(token, options={"verify_signature": False})
        issuer: str = unverified.get("iss", "")
        if not issuer:
            raise HTTPException(status_code=401, detail="Invalid token")

        keys = await _get_jwks(issuer)
        matching_key = next((k for k in keys if k.get("kid") == kid), None)

        if matching_key is None:
            # Clerk may have rotated keys — retry with a fresh fetch once
            keys = await _get_jwks(issuer, invalidate=True)
            matching_key = next((k for k in keys if k.get("kid") == kid), None)

        if matching_key is None:
            logger.warning("Clerk auth: no JWKS key matched kid=%s issuer=%s", kid, issuer)
            raise HTTPException(status_code=401, detail="Invalid token")

        public_key, alg = _public_key_and_alg(matching_key)

        claims = jwt.decode(
            token,
            public_key,
            algorithms=[alg, alg_hint],
            leeway=30,                      # tolerate up to 30s clock skew
            options={"verify_aud": False},  # Clerk omits aud by default
        )

        user_id: str | None = claims.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Clerk token verification failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=401, detail="Invalid token")
