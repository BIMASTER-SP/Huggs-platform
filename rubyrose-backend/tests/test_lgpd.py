"""LGPD endpoints — privacy policy, consent, data export, account deletion."""


def test_privacy_policy_is_public(client):
    res = client.get("/api/lgpd/privacy-policy")
    assert res.status_code == 200
    body = res.json()["data"]
    assert "title" in body
    assert "sections" in body


def test_consent_requires_auth(client):
    res = client.post("/api/lgpd/consent", json={"consent_data_collection": True})
    assert res.status_code == 401


def test_consent_persists_for_authenticated_user(client, auth_headers):
    res = client.post(
        "/api/lgpd/consent",
        headers=auth_headers,
        json={
            "consent_data_collection": True,
            "consent_marketing": True,
            "consent_third_party": False,
        },
    )
    assert res.status_code == 200


def test_export_returns_user_data(client, auth_headers):
    res = client.get("/api/lgpd/export", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()["data"]
    assert body["personal_data"]["email"] == "ana@email.com"
    assert "password_hash" not in body["personal_data"]
    assert "orders" in body
    assert "receipts" in body
    assert "exported_at" in body


def test_delete_data_removes_user(client, auth_headers):
    res = client.delete("/api/lgpd/data", headers=auth_headers)
    assert res.status_code == 200
    # Same token is now invalid because the user was removed.
    me = client.get("/api/auth/me", headers=auth_headers)
    assert me.status_code == 401
