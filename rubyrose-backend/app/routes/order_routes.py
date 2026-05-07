"""Order Routes - Create, list, detail, status update with pagination"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth, require_role
from app.database import CATALOG_PRODUCTS, orders_db, stores_db
from app.logger import log_activity
from app.models import CreateOrderRequest
from app.responses import apply_pagination, paginated_response, success_response

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("")
def create_order(req: CreateOrderRequest, user: dict = Depends(require_role(["promotora", "gerente_loja"]))):
    if not user.get("store_cnpj"):
        raise HTTPException(status_code=400, detail="Voce precisa estar vinculada a uma loja para fazer pedidos")
    store = stores_db.get(user["store_cnpj"])
    if not store:
        raise HTTPException(status_code=400, detail="Loja nao encontrada")
    if not req.items:
        raise HTTPException(status_code=400, detail="Pedido deve ter pelo menos um item")
    order_items = []
    total_value = 0.0
    for item in req.items:
        product = None
        for p in CATALOG_PRODUCTS:
            if p["id"] == item.product_id:
                product = p
                break
        if not product:
            raise HTTPException(status_code=400, detail=f"Produto ID {item.product_id} nao encontrado")
        if item.quantity < product.get("min_order", 1):
            raise HTTPException(status_code=400, detail=f"{product['name']}: quantidade minima e {product.get('min_order', 1)} unidades")
        item_total = round(item.quantity * product["price"], 2)
        total_value += item_total
        order_items.append({
            "product_id": product["id"], "name": product["name"],
            "quantity": item.quantity, "unit_price": product["price"], "total": item_total,
        })
    total_value = round(total_value, 2)
    points_earned = int(total_value / 20)
    order_id = f"order-{uuid.uuid4().hex[:8]}"
    order = {
        "id": order_id, "user_id": user["id"], "store_cnpj": user["store_cnpj"],
        "store_name": store["name"], "items": order_items, "total_value": total_value,
        "points_earned": points_earned, "status": "enviado",
        "vendedor_ruby_id": store.get("vendedor_ruby_id"),
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    orders_db.append(order)
    user["points"] = user.get("points", 0) + points_earned
    user["total_orders"] = user.get("total_orders", 0) + 1
    user["total_order_value"] = round(user.get("total_order_value", 0.0) + total_value, 2)
    total_pts = user["points"]
    if total_pts >= 2000:
        user["level"] = "Ouro"
    elif total_pts >= 1000:
        user["level"] = "Prata"
    else:
        user["level"] = "Bronze"
    log_activity(user["id"], user["name"], "order_create", f"Pedido {order_id} - R${total_value}", module="orders")
    return success_response(
        data={"order": order},
        message=f"Pedido #{order_id} criado com sucesso! +{points_earned} pontos",
    )


@router.get("")
def list_orders(
    user: dict = Depends(require_auth),
    page: int = 1,
    per_page: int = 20,
    search: str | None = None,
    status: str | None = None,
    sort_by: str | None = None,
    sort_dir: str = "desc",
):
    if user["role"] == "admin":
        user_orders = orders_db
    elif user["role"] == "vendedor_ruby":
        user_orders = [o for o in orders_db if o.get("vendedor_ruby_id") == user["id"]]
    else:
        user_orders = [o for o in orders_db if o["user_id"] == user["id"]]
    filters = {}
    if status:
        filters["status"] = status
    items, total = apply_pagination(
        user_orders, page=page, per_page=per_page,
        search=search, search_fields=["store_name", "id"],
        sort_by=sort_by or "created_at", sort_dir=sort_dir,
        filters=filters,
    )
    return paginated_response(items, total, page, per_page, "Pedidos carregados")


@router.get("/{order_id}")
def get_order(order_id: str, user: dict = Depends(require_auth)):
    for o in orders_db:
        if o["id"] == order_id:
            if user["role"] not in ["admin", "vendedor_ruby"] and o["user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Acesso negado a este pedido")
            return success_response(data=o)
    raise HTTPException(status_code=404, detail="Pedido nao encontrado")


@router.patch("/{order_id}/status")
def update_order_status(order_id: str, status: str, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    valid_statuses = ["enviado", "aprovado", "em_separacao", "em_transito", "entregue", "cancelado"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalido. Use: {', '.join(valid_statuses)}")
    for o in orders_db:
        if o["id"] == order_id:
            o["status"] = status
            o["updated_at"] = datetime.now(UTC).isoformat()
            log_activity(user["id"], user["name"], "order_status", f"Pedido {order_id} -> {status}", module="orders")
            return success_response(data={"order": o}, message=f"Status atualizado para {status}")
    raise HTTPException(status_code=404, detail="Pedido nao encontrado")
