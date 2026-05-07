"""
Verifies that critical entities survive a simulated process restart.

The "restart" is simulated by clearing the in-memory dicts and calling
hydrate_from_db() — the next read should still see the data because it
came back from SQLite.
"""

from app import database


def test_user_survives_restart(client):
    # Register a brand-new user.
    register = client.post("/api/auth/register", json={
        "name": "Persisted User",
        "email": "persist@example.com",
        "cpf": "999.999.999-99",
        "phone": "(11) 91111-2222",
        "password": "password",
        "role": "promotora",
        "store_cnpj": "12345678000190",
    })
    assert register.status_code == 200, register.text

    # Simulate a restart: blow away the in-memory caches, leave the DB alone.
    database.users_db.clear()
    database.stores_db.clear()
    database.orders_db.clear()
    database.lgpd_consents_db.clear()
    database.hydrate_from_db()

    # Login with the same credentials still works because the user came back from disk.
    login = client.post("/api/auth/login", json={
        "email": "persist@example.com",
        "password": "password",
    })
    assert login.status_code == 200, login.text


def test_order_survives_restart(client, auth_headers):
    create = client.post(
        "/api/orders",
        headers=auth_headers,
        json={"items": [{"product_id": 1, "quantity": 6}]},
    )
    assert create.status_code == 200
    order_id = create.json()["data"]["order"]["id"]

    # Simulated restart.
    database.users_db.clear()
    database.stores_db.clear()
    database.orders_db.clear()
    database.lgpd_consents_db.clear()
    database.hydrate_from_db()

    listed = client.get("/api/orders", headers=auth_headers)
    assert listed.status_code == 200
    ids = [o["id"] for o in listed.json()["data"]]
    assert order_id in ids


def test_lgpd_consent_persists(client, auth_headers):
    payload = {"consent_data_collection": True, "consent_marketing": False, "consent_third_party": False}
    res = client.post("/api/lgpd/consent", headers=auth_headers, json=payload)
    assert res.status_code == 200

    database.users_db.clear()
    database.stores_db.clear()
    database.orders_db.clear()
    database.lgpd_consents_db.clear()
    database.hydrate_from_db()

    fetched = client.get("/api/lgpd/consent", headers=auth_headers)
    assert fetched.status_code == 200
    consent = fetched.json()["data"]
    assert consent is not None
    assert consent["consent_data_collection"] is True


def test_account_deletion_persists(client, auth_headers):
    res = client.delete("/api/lgpd/data", headers=auth_headers)
    assert res.status_code == 200

    database.users_db.clear()
    database.stores_db.clear()
    database.orders_db.clear()
    database.lgpd_consents_db.clear()
    database.hydrate_from_db()

    # Login should now fail because the user really was removed from disk.
    login = client.post("/api/auth/login", json={"email": "ana@email.com", "password": "ana123"})
    assert login.status_code == 401
