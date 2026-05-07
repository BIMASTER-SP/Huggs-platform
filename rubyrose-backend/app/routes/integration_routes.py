"""Integration Routes - External system integrations (stock, catalog, prices, promotions, webhooks)"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends

from app.auth import require_admin, require_role
from app.database import (
    integrations_catalog_db,
    integrations_prices_db,
    integrations_promotions_db,
    integrations_stock_db,
    webhooks_db,
)
from app.models import (
    CatalogItemRequest,
    PriceUpdateRequest,
    PromotionRequest,
    StockUpdateRequest,
    WebhookRegisterRequest,
)
from app.responses import success_response

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


@router.get("/stock")
def get_stock(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return success_response(data={"total": len(integrations_stock_db), "stock": integrations_stock_db})


@router.post("/stock")
def update_stock(req: StockUpdateRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    entry = {
        "id": f"stock-{uuid.uuid4().hex[:8]}", "product_ean": req.product_ean,
        "quantity": req.quantity, "warehouse": req.warehouse,
        "updated_by": user["id"], "updated_at": datetime.now(UTC).isoformat(),
    }
    integrations_stock_db.append(entry)
    return success_response(data={"entry": entry}, message="Estoque atualizado")


@router.get("/catalog")
def get_ext_catalog(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return success_response(data={"total": len(integrations_catalog_db), "catalog": integrations_catalog_db})


@router.post("/catalog")
def add_catalog_item(req: CatalogItemRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    item = {
        "id": f"cat-{uuid.uuid4().hex[:8]}", **req.model_dump(),
        "created_by": user["id"], "created_at": datetime.now(UTC).isoformat(),
    }
    integrations_catalog_db.append(item)
    return success_response(data={"item": item}, message="Item adicionado ao catalogo")


@router.get("/prices")
def get_prices(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return success_response(data={"total": len(integrations_prices_db), "prices": integrations_prices_db})


@router.post("/prices")
def update_price(req: PriceUpdateRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    entry = {
        "id": f"price-{uuid.uuid4().hex[:8]}", "product_id": req.product_id,
        "new_price": req.new_price, "effective_date": req.effective_date,
        "updated_by": user["id"], "updated_at": datetime.now(UTC).isoformat(),
    }
    integrations_prices_db.append(entry)
    return success_response(data={"entry": entry}, message="Preco atualizado")


@router.get("/promotions")
def get_promotions(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return success_response(data={"total": len(integrations_promotions_db), "promotions": integrations_promotions_db})


@router.post("/promotions")
def create_promotion(req: PromotionRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    promo = {
        "id": f"promo-{uuid.uuid4().hex[:8]}", **req.model_dump(),
        "created_by": user["id"], "created_at": datetime.now(UTC).isoformat(),
    }
    integrations_promotions_db.append(promo)
    return success_response(data={"promotion": promo}, message="Promocao criada")


@router.get("/webhooks")
def list_webhooks(user: dict = Depends(require_admin)):
    return success_response(data={"total": len(webhooks_db), "webhooks": webhooks_db})


@router.post("/webhooks")
def register_webhook(req: WebhookRegisterRequest, user: dict = Depends(require_admin)):
    wh = {
        "id": f"wh-{uuid.uuid4().hex[:8]}", "url": req.url, "events": req.events,
        "secret": req.secret, "description": req.description,
        "created_by": user["id"], "created_at": datetime.now(UTC).isoformat(),
        "active": True,
    }
    webhooks_db.append(wh)
    return success_response(data={"webhook": wh}, message="Webhook registrado")
