"""Smoke tests covering health, auth, RBAC, and a couple of guarded endpoints."""


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "success"
    assert body["data"]["status"] == "healthy"


def test_login_success(client):
    res = client.post("/api/auth/login", json={"email": "ana@email.com", "password": "ana123"})
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["token"]
    assert body["data"]["user"]["email"] == "ana@email.com"
    assert "password_hash" not in body["data"]["user"]


def test_login_wrong_password(client):
    res = client.post("/api/auth/login", json={"email": "ana@email.com", "password": "wrong"})
    assert res.status_code == 401


def test_login_unknown_user(client):
    res = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert res.status_code == 401


def test_me_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_me_with_auth(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["email"] == "ana@email.com"


def test_admin_endpoint_blocked_for_promotora(client, auth_headers):
    res = client.get("/api/admin/stats", headers=auth_headers)
    assert res.status_code == 403


def test_admin_endpoint_allowed_for_admin(client, admin_headers):
    res = client.get("/api/admin/stats", headers=admin_headers)
    assert res.status_code == 200


def test_register_rejects_duplicate_email(client):
    payload = {
        "name": "Ana Silva",  # Already in seed data
        "email": "ana@email.com",
        "cpf": "111.111.111-11",
        "phone": "(11) 98888-1111",
        "password": "any",
        "role": "promotora",
        "store_cnpj": "12345678000190",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400


def test_cupom_lookup_validates_chave(client):
    # Below 44 digits — should reject.
    res = client.post("/api/receipts/lookup", json={"access_key": "1234"})
    assert res.status_code == 400


def test_cors_header_present(client):
    res = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    # FastAPI/Starlette CORS responds 200 to preflight; the header echoes the allowed origin.
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
