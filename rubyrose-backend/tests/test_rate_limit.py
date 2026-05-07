"""Verifies slowapi enforces the configured rate limits on sensitive endpoints."""

import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def tight_client(monkeypatch):
    """A client whose login limit is 2/minute so tests don't have to spam."""
    monkeypatch.setenv("RATE_LIMIT_LOGIN", "2/minute")
    # Force re-import so settings re-read env.
    import importlib

    import app.config
    import app.rate_limit
    importlib.reload(app.config)
    importlib.reload(app.rate_limit)
    import app.main
    importlib.reload(app.main)

    from app import database
    for store in (database.users_db, database.stores_db):
        store.clear()
    for store in (database.orders_db, database.CATALOG_PRODUCTS, database.banners_db, database.challenges_db, database.reward_kits_db, database.admin_stock_db, database.admin_images_db, database.admin_integrations_db):
        store.clear()
    database.seed_data()

    if hasattr(app.main.app.state, "limiter"):
        app.main.app.state.limiter.reset()

    with TestClient(app.main.app) as c:
        yield c

    # Restore standard env for the next test.
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
