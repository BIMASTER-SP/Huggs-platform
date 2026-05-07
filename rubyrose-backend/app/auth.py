"""
Authentication & Authorization Module
======================================
JWT token management and FastAPI dependencies for route protection.

Future migration path:
  - Replace JWT with AWS Cognito tokens
  - Add OAuth2 / SAML for enterprise SSO
  - Integrate with API Gateway authorizers
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database import users_db

security = HTTPBearer(auto_error=False)


def create_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT token for authenticated user."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")


def _extract_token(
    credentials: Optional[HTTPAuthorizationCredentials], request: Request
) -> Optional[str]:
    """Extract JWT token from Bearer header or X-Auth-Token custom header.
    X-Auth-Token is used when Authorization header is occupied by tunnel Basic Auth."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    custom = request.headers.get("x-auth-token")
    if custom:
        return custom
    return None


def safe_user_response(user: dict) -> dict:
    """Remove sensitive fields from user dict before sending to client."""
    return {k: v for k, v in user.items() if k != "password_hash"}


# ============================================================
# FASTAPI DEPENDENCIES
# ============================================================
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
) -> Optional[dict]:
    """Get current user if authenticated, or None if not."""
    token = _extract_token(credentials, request)
    if token is None:
        return None
    payload = decode_token(token)
    email = payload.get("email")
    if not email:
        return None
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    return user


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
) -> dict:
    """Require authentication. Raises 401 if not authenticated."""
    token = _extract_token(credentials, request)
    if token is None:
        raise HTTPException(status_code=401, detail="Autenticacao necessaria")
    payload = decode_token(token)
    email = payload.get("email")
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    return user


def require_admin(user: dict = Depends(require_auth)) -> dict:
    """Require admin role."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


def require_role(allowed_roles: list[str]):
    """Factory: require one of the specified roles."""
    def _check(user: dict = Depends(require_auth)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Acesso negado para este perfil")
        return user
    return _check
