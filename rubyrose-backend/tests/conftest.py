"""
Test fixtures.

Sets a deterministic JWT_SECRET and other env defaults BEFORE the app is imported,
otherwise pydantic-settings raises on startup. Each test runs against a fresh
in-memory database (database.py module-level dicts are reseeded between tests).
"""

import os

# Critical: env must be set before app is imported.
os.environ.setdefault("JWT_SECRET", "test-secret-32-chars-or-more-deterministic-not-prod")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")
# Wide rate limits during tests so they don't trip on parallel runs.
os.environ.setdefault("RATE_LIMIT_DEFAULT", "1000/minute")
os.environ.setdefault("RATE_LIMIT_LOGIN", "1000/minute")
os.environ.setdefault("RATE_LIMIT_REGISTER", "1000/minute")
os.environ.setdefault("RATE_LIMIT_CUPOM_LOOKUP", "1000/minute")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Yields a TestClient against a freshly-seeded app."""
    from app import database
    from app.main import app

    # Reset all in-memory stores and reseed.
    for store in (
        database.users_db, database.stores_db, database.lgpd_consents_db, database.company_settings_db,
    ):
        store.clear()
    for store in (
        database.orders_db, database.challenges_db, database.challenge_submissions_db,
        database.receipts_db, database.banners_db, database.reward_kits_db, database.redemptions_db,
        database.webhooks_db, database.integrations_stock_db, database.integrations_catalog_db,
        database.integrations_prices_db, database.integrations_promotions_db,
        database.admin_stock_db, database.admin_images_db, database.admin_integrations_db,
        database.activity_logs_db, database.CATALOG_PRODUCTS,
    ):
        store.clear()
    database.seed_data()

    # Reset slowapi limiter state so request counts don't leak between tests.
    if hasattr(app.state, "limiter"):
        app.state.limiter.reset()

    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    """Returns headers with a valid Bearer token for the seeded promotora ana@email.com."""
    res = client.post("/api/auth/login", json={"email": "ana@email.com", "password": "ana123"})
    assert res.status_code == 200, f"login failed: {res.text}"
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client):
    """Returns headers with a valid Bearer token for the seeded admin."""
    res = client.post("/api/auth/login", json={"email": "admin@rubyrose.com.br", "password": "admin123"})
    assert res.status_code == 200, f"admin login failed: {res.text}"
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}
