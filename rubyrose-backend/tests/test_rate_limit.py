"""Verifies slowapi enforces the configured rate limits on sensitive endpoints."""

import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def tight_client(monkeypatch):
    """A client whose login limit is 2/minute so tests don't have to spam.

    The decorator `@limiter.limit(settings.rate_limit_login)` is evaluated when
    `auth_routes` is first imported, so we have to reload the whole chain
    (config → rate_limit → routes/auth_routes → main) for the new env to take.
    """
    monkeypatch.setenv("RATE_LIMIT_LOGIN", "2/minute")
    import importlib

    import app.config
    import app.main
    import app.rate_limit
    import app.routes.auth_routes
    importlib.reload(app.config)
    importlib.reload(app.rate_limit)
    importlib.reload(app.routes.auth_routes)
    importlib.reload(app.main)

    from app import database
    for store_name in (
        "users_db", "stores_db", "lgpd_consents_db",
    ):
        getattr(database, store_name).clear()
    for store_name in (
        "orders_db", "challenges_db", "challenge_submissions_db",
        "receipts_db", "banners_db", "reward_kits_db", "redemptions_db",
        "webhooks_db", "integrations_stock_db", "integrations_catalog_db",
        "integrations_prices_db", "integrations_promotions_db",
        "admin_stock_db", "admin_images_db", "admin_integrations_db",
        "activity_logs_db", "CATALOG_PRODUCTS",
    ):
        getattr(database, store_name).clear()
    database.seed_data()

    if hasattr(app.main.app.state, "limiter"):
        app.main.app.state.limiter.reset()

    with TestClient(app.main.app) as c:
        yield c

    monkeypatch.setenv("RATE_LIMIT_LOGIN", os.environ.get("RATE_LIMIT_LOGIN", "1000/minute"))


def test_login_rate_limit(tight_client):
    payload = {"email": "ana@email.com", "password": "wrong-on-purpose"}
    # First 2 hits return 401 (auth fails normally).
    assert tight_client.post("/api/auth/login", json=payload).status_code == 401
    assert tight_client.post("/api/auth/login", json=payload).status_code == 401
    # 3rd hit trips the limit and returns 429.
    res = tight_client.post("/api/auth/login", json=payload)
    assert res.status_code == 429
    assert "rate limit" in res.text.lower()
