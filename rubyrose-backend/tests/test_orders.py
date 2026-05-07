"""Order CRUD — happy path + RBAC + minimum-quantity validation."""


def test_create_order_happy_path(client, auth_headers):
    res = client.post(
        "/api/orders",
        headers=auth_headers,
        json={"items": [{"product_id": 1, "quantity": 6}]},
    )
    assert res.status_code == 200
    order = res.json()["data"]["order"]
    assert order["status"] == "enviado"
    assert order["total_value"] > 0
    assert order["points_earned"] > 0


def test_create_order_rejects_below_min_qty(client, auth_headers):
    # min_order for product 1 is 6.
    res = client.post(
        "/api/orders",
        headers=auth_headers,
        json={"items": [{"product_id": 1, "quantity": 1}]},
    )
    assert res.status_code == 400


def test_create_order_rejects_unknown_product(client, auth_headers):
    res = client.post(
        "/api/orders",
        headers=auth_headers,
        json={"items": [{"product_id": 99999, "quantity": 6}]},
    )
    assert res.status_code == 400


def test_list_orders_returns_only_user_orders(client, auth_headers):
    # Ana already has 2 seeded orders; others are scoped out.
    res = client.get("/api/orders", headers=auth_headers)
    assert res.status_code == 200
    orders = res.json()["data"]
    assert isinstance(orders, list)
    # All seeded orders for ana belong to promotora-001.
    for o in orders:
        assert o["user_id"] == "promotora-001"


def test_create_order_requires_auth(client):
    res = client.post("/api/orders", json={"items": []})
    assert res.status_code == 401
