"""Catalog endpoints — public, no auth needed."""


def test_list_catalog(client):
    res = client.get("/api/catalog")
    assert res.status_code == 200
    products = res.json()["data"]
    assert isinstance(products, list)
    assert len(products) >= 5
    sample = products[0]
    assert {"id", "ean", "name", "price", "category", "min_order"}.issubset(sample.keys())


def test_filter_catalog_by_category(client):
    res = client.get("/api/catalog?category=Skincare")
    assert res.status_code == 200
    products = res.json()["data"]
    assert all(p["category"] == "Skincare" for p in products)


def test_list_categories(client):
    res = client.get("/api/catalog/categories")
    assert res.status_code == 200
    cats = res.json()["data"]["categories"]
    assert "Maquiagem" in cats
    assert "Skincare" in cats
