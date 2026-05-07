"""Dashboard Routes - User dashboard and admin dashboard with chart data"""

from fastapi import APIRouter, Depends

from app.auth import require_admin, require_auth, safe_user_response
from app.database import (
    CATALOG_PRODUCTS,
    admin_images_db,
    admin_integrations_db,
    admin_stock_db,
    banners_db,
    challenge_submissions_db,
    challenges_db,
    orders_db,
    redemptions_db,
    stores_db,
    users_db,
)
from app.responses import success_response

router = APIRouter(tags=["Dashboard"])


@router.get("/api/dashboard")
def get_dashboard(user: dict = Depends(require_auth)):
    store = stores_db.get(user.get("store_cnpj", ""))
    user_orders = [o for o in orders_db if o["user_id"] == user["id"]]
    active_challenges = [c for c in challenges_db if c["active"]]
    user_submissions = [s for s in challenge_submissions_db if s["user_id"] == user["id"]]
    active_banners = sorted([b for b in banners_db if b["active"]], key=lambda x: x.get("position", 999))
    recent_orders = sorted(user_orders, key=lambda x: x["created_at"], reverse=True)[:3]
    challenge_progress = []
    for c in active_challenges[:4]:
        subs = [s for s in user_submissions if s["challenge_id"] == c["id"]]
        challenge_progress.append({
            "id": c["id"], "title": c["title"], "type": c["type"],
            "progress": len(subs), "goal": c["goal"], "points_reward": c["points_reward"],
        })
    return success_response(data={
        "user": safe_user_response(user), "store": store,
        "points": user.get("points", 0), "level": user.get("level", "Bronze"),
        "total_orders": len(user_orders),
        "total_order_value": sum(o["total_value"] for o in user_orders),
        "banners": active_banners, "recent_orders": recent_orders,
        "active_challenges": challenge_progress,
        "pending_challenges": len([c for c in challenge_progress if c["progress"] < c["goal"]]),
    })


@router.get("/api/admin/stats")
def get_admin_stats(user: dict = Depends(require_admin)):
    """Enhanced admin stats with chart-ready data."""
    total_users = len(users_db)
    total_stores = len(stores_db)
    total_orders = len(orders_db)
    total_revenue = sum(o["total_value"] for o in orders_db)
    total_products = len(CATALOG_PRODUCTS)
    active_chall = len([c for c in challenges_db if c["active"]])
    total_subs = len(challenge_submissions_db)
    total_reds = len(redemptions_db)

    users_by_role: dict[str, int] = {}
    for u in users_db.values():
        r = u.get("role", "unknown")
        users_by_role[r] = users_by_role.get(r, 0) + 1

    orders_by_status: dict[str, int] = {}
    for o in orders_db:
        s = o["status"]
        orders_by_status[s] = orders_by_status.get(s, 0) + 1

    # Chart data: sales by period (last 6 months simulated)
    sales_by_period = [
        {"month": "Out", "vendas": 8500, "pedidos": 12},
        {"month": "Nov", "vendas": 12300, "pedidos": 18},
        {"month": "Dez", "vendas": 15800, "pedidos": 25},
        {"month": "Jan", "vendas": 9200, "pedidos": 14},
        {"month": "Fev", "vendas": 11100, "pedidos": 17},
        {"month": "Mar", "vendas": round(total_revenue, 2), "pedidos": total_orders},
    ]

    # Chart data: top selling products
    product_sales: dict[str, float] = {}
    for o in orders_db:
        for item in o.get("items", []):
            name = item.get("name", "Desconhecido")
            product_sales[name] = product_sales.get(name, 0) + item.get("total", 0)
    top_products = sorted(
        [{"name": k[:20], "valor": round(v, 2)} for k, v in product_sales.items()],
        key=lambda x: x["valor"], reverse=True,
    )[:8]

    # Chart data: orders by status (pie chart)
    status_chart = [{"name": k, "value": v} for k, v in orders_by_status.items()]

    # Stock alerts
    low_stock_items = [
        {"name": s["product_name"], "quantity": s["quantity"], "alert": s.get("low_stock_alert", 10)}
        for s in admin_stock_db if s["quantity"] <= s.get("low_stock_alert", 10)
    ]

    return success_response(data={
        "total_users": total_users, "total_stores": total_stores,
        "total_orders": total_orders, "total_revenue": round(total_revenue, 2),
        "total_products": total_products, "active_challenges": active_chall,
        "total_submissions": total_subs, "total_redemptions": total_reds,
        "users_by_role": users_by_role, "orders_by_status": orders_by_status,
        "active_banners": len([b for b in banners_db if b["active"]]),
        "total_banners": len(banners_db),
        "total_stock_entries": len(admin_stock_db),
        "low_stock_count": len(low_stock_items),
        "total_images": len(admin_images_db),
        "total_integrations": len(admin_integrations_db),
        "active_integrations": len([ig for ig in admin_integrations_db if ig["active"]]),
        # Chart-ready data
        "charts": {
            "sales_by_period": sales_by_period,
            "top_products": top_products,
            "orders_by_status": status_chart,
            "stock_alerts": low_stock_items,
        },
    })
