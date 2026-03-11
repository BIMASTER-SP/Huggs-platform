"""Catalog Routes - Product catalog with pagination, search, filters"""

from typing import Optional
from fastapi import APIRouter, HTTPException

from app.database import CATALOG_PRODUCTS
from app.responses import success_response, paginated_response, apply_pagination

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])


@router.get("")
def get_catalog(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
):
    filters = {}
    if category and category != "Todas":
        filters["category"] = category
    items, total = apply_pagination(
        CATALOG_PRODUCTS,
        page=page, per_page=per_page,
        search=search, search_fields=["name", "description", "category"],
        sort_by=sort_by or "name", sort_dir=sort_dir,
        filters=filters,
    )
    return paginated_response(items, total, page, per_page, "Catalogo carregado")


@router.get("/categories")
def get_categories():
    cats = sorted(set(p["category"] for p in CATALOG_PRODUCTS))
    return success_response(data={"categories": ["Todas"] + cats})


@router.get("/{product_id}")
def get_product_detail(product_id: int):
    for p in CATALOG_PRODUCTS:
        if p["id"] == product_id:
            return success_response(data=p)
    raise HTTPException(status_code=404, detail="Produto nao encontrado")
