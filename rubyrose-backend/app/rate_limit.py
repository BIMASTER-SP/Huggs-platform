"""
Rate Limiter
============
Shared slowapi Limiter instance. Routes import `limiter` and decorate sensitive
endpoints with `@limiter.limit(...)`. Endpoints that need limiting must accept
`request: Request` in their signature so slowapi can extract the client IP.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_default])
