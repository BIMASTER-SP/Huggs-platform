"""
Ruby Rose B2B Platform - Main Application
==========================================
Professional modular architecture prepared for AWS migration.

Architecture:
  app/
    main.py          - App setup, CORS, router registration (this file)
    database.py      - Repository layer (in-memory, ready for RDS)
    auth.py          - JWT authentication & authorization
    models.py        - Pydantic request/response schemas
    responses.py     - Standardized API response format
    logger.py        - Structured logging (CloudWatch-ready)
    utils.py         - Shared utilities (NFe simulation, upload helpers)
    routes/
      auth_routes.py       - Registration, login, profile
      catalog_routes.py    - Product catalog (public, paginated)
      order_routes.py      - Order CRUD (paginated)
      challenge_routes.py  - Challenge management
      reward_routes.py     - Reward kits & redemptions
      receipt_routes.py    - Cupom fiscal / NFe scanning
      store_routes.py      - Store management
      banner_routes.py     - Banner CRUD
      lgpd_routes.py       - LGPD compliance
      integration_routes.py - External system integrations
      dashboard_routes.py  - User & admin dashboards
      admin_routes.py      - Full admin panel
      upload_routes.py     - Image upload with validation (S3-ready)

Migration path to AWS:
  1. database.py  -> SQLAlchemy + RDS (PostgreSQL)
  2. upload_routes.py -> boto3 S3 + CloudFront CDN
  3. logger.py -> CloudWatch Logs + X-Ray
  4. auth.py -> AWS Cognito
  5. Deploy via ECS/Fargate or Lambda + API Gateway
"""

import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database import seed_data
from app.logger import get_logger, log_system_event
from app.rate_limit import limiter
from app.responses import error_response, success_response

# ============================================================
# APP SETUP
# ============================================================
@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup/shutdown hook — replaces the deprecated `@app.on_event`."""
    seed_data()
    log_system_event("app_startup", "Ruby Rose B2B API v4.0 iniciada - Arquitetura modular")
    yield
    # No teardown work yet; closing DB pools / flushing queues will go here.


app = FastAPI(
    title="Ruby Rose B2B API",
    version="4.0.0",
    description="API profissional para plataforma B2B Ruby Rose - Arquitetura modular preparada para AWS.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting: per-endpoint limits are applied via @limiter.limit() in each router;
# default_limits in app.rate_limit applies to everything else.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

logger = get_logger("main")

# ============================================================
# REQUEST LOGGING MIDDLEWARE
# ============================================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = round((time.time() - start_time) * 1000, 2)
    if request.url.path not in ("/api/health", "/docs", "/openapi.json"):
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration}ms)",
            extra={"request_id": request.headers.get("x-request-id", "")},
        )
    return response


# ============================================================
# GLOBAL ERROR HANDLER
# ============================================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(message=exc.detail),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=error_response(message="Erro interno do servidor"),
    )


# ============================================================
# REGISTER ALL ROUTERS
# ============================================================
from app.routes.admin_routes import router as admin_router
from app.routes.auth_routes import router as auth_router
from app.routes.banner_routes import router as banner_router
from app.routes.catalog_routes import router as catalog_router
from app.routes.challenge_routes import router as challenge_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.integration_routes import router as integration_router
from app.routes.lgpd_routes import router as lgpd_router
from app.routes.order_routes import router as order_router
from app.routes.receipt_routes import router as receipt_router
from app.routes.reward_routes import router as reward_router
from app.routes.store_routes import router as store_router
from app.routes.upload_routes import router as upload_router

app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(order_router)
app.include_router(challenge_router)
app.include_router(reward_router)
app.include_router(receipt_router)
app.include_router(store_router)
app.include_router(banner_router)
app.include_router(lgpd_router)
app.include_router(integration_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(upload_router)

# ============================================================
# STATIC FILES (image uploads - future: S3/CloudFront)
# ============================================================
upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# ============================================================
# HEALTH CHECK & ROOT
# ============================================================
@app.get("/api/health")
def health_check():
    return success_response(
        data={
            "status": "healthy",
            "version": "4.0.0",
            "architecture": "modular",
            "database": "in-memory (ready for RDS migration)",
            "modules": [
                "auth", "catalog", "orders", "challenges", "rewards",
                "receipts", "stores", "banners", "lgpd", "integrations",
                "dashboard", "admin", "upload",
            ],
        },
        message="Ruby Rose B2B API - Operacional",
    )


@app.get("/")
def root():
    return success_response(
        data={"api_url": "/api", "docs_url": "/docs", "version": "4.0.0"},
        message="Ruby Rose B2B Platform API v4.0 - Arquitetura Profissional",
    )


# Startup logic moved to the `lifespan` context manager at the top of this module.
