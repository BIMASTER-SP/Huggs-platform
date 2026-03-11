"""Store Routes - List stores, store details"""

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth, require_role, safe_user_response
from app.database import stores_db, users_db, orders_db
from app.responses import success_response

router = APIRouter(prefix="/api/stores", tags=["Stores"])


@router.get("")
def list_stores(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    if user["role"] == "vendedor_ruby":
        stores = [s for s in stores_db.values() if s.get("vendedor_ruby_id") == user["id"]]
    else:
        stores = list(stores_db.values())
    return success_response(data={"total": len(stores), "stores": stores})


@router.get("/{cnpj}")
def get_store(cnpj: str, user: dict = Depends(require_auth)):
    store = stores_db.get(cnpj)
    if not store:
        raise HTTPException(status_code=404, detail="Loja nao encontrada")
    promotoras = [safe_user_response(u) for u in users_db.values() if u.get("store_cnpj") == cnpj and u["role"] == "promotora"]
    store_orders = [o for o in orders_db if o.get("store_cnpj") == cnpj]
    return success_response(data={
        **store, "promotoras_count": len(promotoras),
        "orders_count": len(store_orders),
        "total_order_value": sum(o["total_value"] for o in store_orders),
    })
