"""Admin Routes - User, product, store, order, stock, image, integration management with pagination"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid
import bcrypt

from app.auth import require_admin, safe_user_response
from app.database import (
    users_db, stores_db, orders_db, CATALOG_PRODUCTS,
    admin_stock_db, admin_images_db, admin_integrations_db,
    activity_logs_db, company_settings_db, challenges_db,
)
from app.models import (
    CompanySettingsUpdate, AdminProductRequest, AdminProductUpdate,
    AdminCreateUserRequest, AdminEditUserRequest, AdminStoreRequest,
    AdminStockUpdateRequest, AdminImageRequest, AdminIntegrationRequest,
    ChallengeCreateRequest,
)
from app.responses import success_response, paginated_response, apply_pagination
from app.logger import log_activity

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ============================================================
# COMPANY SETTINGS
# ============================================================
@router.get("/company")
def get_company_settings(user: dict = Depends(require_admin)):
    return success_response(data=company_settings_db)


@router.put("/company")
def update_company_settings(req: CompanySettingsUpdate, user: dict = Depends(require_admin)):
    for field, value in req.model_dump(exclude_none=True).items():
        company_settings_db[field] = value
    company_settings_db["updated_at"] = datetime.now(timezone.utc).isoformat()
    log_activity(user["id"], user["name"], "company_update", "Configuracoes da empresa atualizadas")
    return success_response(data={"settings": company_settings_db}, message="Configuracoes atualizadas com sucesso")


# ============================================================
# USER MANAGEMENT (with pagination/search/filters)
# ============================================================
@router.get("/users")
def list_users(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
):
    all_users = [safe_user_response(u) for u in users_db.values()]
    filters = {}
    if role:
        filters["role"] = role
    if status:
        filters["status"] = status
    items, total = apply_pagination(
        all_users, page=page, per_page=per_page,
        search=search, search_fields=["name", "email", "cpf", "phone"],
        sort_by=sort_by or "name", sort_dir=sort_dir,
        filters=filters,
    )
    return paginated_response(items, total, page, per_page, "Usuarios carregados")


@router.post("/users")
def admin_create_user(req: AdminCreateUserRequest, user: dict = Depends(require_admin)):
    if req.email in users_db:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")
    valid_roles = ["promotora", "gerente_loja", "vendedor_ruby", "admin"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Perfil invalido")
    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    uid = f"user-{uuid.uuid4().hex[:8]}"
    new_user = {
        "id": uid, "name": req.name, "email": req.email, "cpf": req.cpf,
        "phone": req.phone, "password_hash": pw_hash, "role": req.role,
        "status": req.status, "store_cnpj": req.store_cnpj, "points": 0,
        "level": "Bronze", "total_orders": 0, "total_order_value": 0.0,
        "challenges_completed": 0, "receipts_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lgpd_consent": False, "lgpd_consent_date": None,
    }
    users_db[req.email] = new_user
    log_activity(user["id"], user["name"], "user_create", f"Usuario criado: {req.name}")
    return success_response(data={"user": safe_user_response(new_user)}, message="Usuario criado com sucesso")


@router.put("/users/{user_id}")
def admin_edit_user(user_id: str, req: AdminEditUserRequest, admin_user: dict = Depends(require_admin)):
    for u in users_db.values():
        if u["id"] == user_id:
            for field, value in req.model_dump(exclude_none=True).items():
                u[field] = value
            log_activity(admin_user["id"], admin_user["name"], "user_edit", f"Usuario editado: {u['name']}")
            return success_response(data={"user": safe_user_response(u)}, message="Usuario atualizado")
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


@router.patch("/users/{user_id}/approve")
def approve_user(user_id: str, admin_user: dict = Depends(require_admin)):
    for u in users_db.values():
        if u["id"] == user_id:
            u["status"] = "active"
            log_activity(admin_user["id"], admin_user["name"], "user_approve", f"Usuario aprovado: {u['name']}")
            return success_response(data={"user": safe_user_response(u)}, message="Usuario aprovado com sucesso")
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


@router.patch("/users/{user_id}/role")
def update_user_role(user_id: str, role: str, admin_user: dict = Depends(require_admin)):
    valid_roles = ["promotora", "gerente_loja", "vendedor_ruby", "admin"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Perfil invalido. Use: {', '.join(valid_roles)}")
    for u in users_db.values():
        if u["id"] == user_id:
            u["role"] = role
            return success_response(data={"user": safe_user_response(u)}, message=f"Perfil atualizado para {role}")
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


@router.patch("/users/{user_id}/toggle")
def admin_toggle_user(user_id: str, admin_user: dict = Depends(require_admin)):
    for u in users_db.values():
        if u["id"] == user_id:
            u["status"] = "inactive" if u.get("status") == "active" else "active"
            st = u["status"]
            log_activity(admin_user["id"], admin_user["name"], "user_toggle", f"Usuario {st}: {u['name']}")
            return success_response(data={"user": safe_user_response(u)}, message=f"Usuario {st}")
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


# ============================================================
# PRODUCT MANAGEMENT (with pagination/search/filters)
# ============================================================
@router.get("/products")
def admin_list_products(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
):
    filters = {}
    if category:
        filters["category"] = category
    items, total = apply_pagination(
        CATALOG_PRODUCTS, page=page, per_page=per_page,
        search=search, search_fields=["name", "ean", "description", "category"],
        sort_by=sort_by or "name", sort_dir=sort_dir,
        filters=filters,
    )
    return paginated_response(items, total, page, per_page, "Produtos carregados")


@router.post("/products")
def admin_create_product(req: AdminProductRequest, user: dict = Depends(require_admin)):
    new_id = max((p["id"] for p in CATALOG_PRODUCTS), default=0) + 1
    product = {
        "id": new_id, "ean": req.ean or f"78965228{new_id:05d}",
        "name": req.name, "image": req.image or "product", "price": req.price,
        "category": req.category, "description": req.description or "",
        "min_order": req.min_order, "stock_available": req.stock_available,
    }
    CATALOG_PRODUCTS.append(product)
    log_activity(user["id"], user["name"], "product_create", f"Produto criado: {req.name}")
    return success_response(data={"product": product}, message="Produto criado com sucesso")


@router.put("/products/{product_id}")
def admin_update_product(product_id: int, req: AdminProductUpdate, user: dict = Depends(require_admin)):
    for p in CATALOG_PRODUCTS:
        if p["id"] == product_id:
            for field, value in req.model_dump(exclude_none=True).items():
                p[field] = value
            log_activity(user["id"], user["name"], "product_update", f"Produto atualizado: {p['name']}")
            return success_response(data={"product": p}, message="Produto atualizado")
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


@router.delete("/products/{product_id}")
def admin_delete_product(product_id: int, user: dict = Depends(require_admin)):
    for i, p in enumerate(CATALOG_PRODUCTS):
        if p["id"] == product_id:
            removed = CATALOG_PRODUCTS.pop(i)
            log_activity(user["id"], user["name"], "product_delete", f"Produto removido: {removed['name']}")
            return success_response(message="Produto removido")
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


@router.patch("/products/{product_id}/toggle")
def admin_toggle_product(product_id: int, user: dict = Depends(require_admin)):
    for p in CATALOG_PRODUCTS:
        if p["id"] == product_id:
            p["stock_available"] = not p.get("stock_available", True)
            st = "ativado" if p["stock_available"] else "desativado"
            log_activity(user["id"], user["name"], "product_toggle", f"Produto {st}: {p['name']}")
            return success_response(data={"product": p}, message=f"Produto {st}")
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


# ============================================================
# STORE MANAGEMENT
# ============================================================
@router.post("/stores")
def admin_create_store(req: AdminStoreRequest, user: dict = Depends(require_admin)):
    if req.cnpj in stores_db:
        raise HTTPException(status_code=400, detail="CNPJ ja cadastrado")
    store = {
        "cnpj": req.cnpj, "name": req.name, "address": req.address or "",
        "city": req.city or "", "state": req.state or "",
        "phone": req.phone or "", "vendedor_ruby_id": req.vendedor_ruby_id,
        "status": "active", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    stores_db[req.cnpj] = store
    log_activity(user["id"], user["name"], "store_create", f"Loja criada: {req.name}")
    return success_response(data={"store": store}, message="Loja criada com sucesso")


# ============================================================
# ORDER MANAGEMENT (with pagination/search/filters)
# ============================================================
@router.get("/orders")
def admin_list_orders(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "desc",
):
    filters = {}
    if status:
        filters["status"] = status
    items, total = apply_pagination(
        orders_db, page=page, per_page=per_page,
        search=search, search_fields=["store_name", "id", "user_id"],
        sort_by=sort_by or "created_at", sort_dir=sort_dir,
        filters=filters,
    )
    stats = {
        "total": len(orders_db),
        "by_status": {},
        "total_value": sum(o["total_value"] for o in orders_db),
    }
    for o in orders_db:
        s = o["status"]
        stats["by_status"][s] = stats["by_status"].get(s, 0) + 1
    return paginated_response(items, total, page, per_page, "Pedidos carregados")


# ============================================================
# ACTIVITY LOGS (with pagination)
# ============================================================
@router.get("/logs")
def get_activity_logs(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 50,
    search: Optional[str] = None,
    action: Optional[str] = None,
    sort_dir: str = "desc",
):
    filters = {}
    if action:
        filters["action"] = action
    items, total = apply_pagination(
        activity_logs_db, page=page, per_page=per_page,
        search=search, search_fields=["user_name", "action", "details"],
        sort_by="timestamp", sort_dir=sort_dir,
        filters=filters,
    )
    return paginated_response(items, total, page, per_page, "Logs carregados")


# ============================================================
# STOCK MANAGEMENT (with pagination/search)
# ============================================================
@router.get("/stock")
def admin_list_stock(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    warehouse: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
):
    filters = {}
    if warehouse:
        filters["warehouse"] = warehouse
    items, total = apply_pagination(
        admin_stock_db, page=page, per_page=per_page,
        search=search, search_fields=["product_name", "ean"],
        sort_by=sort_by or "product_name", sort_dir=sort_dir,
        filters=filters,
    )
    low_stock = [s for s in admin_stock_db if s["quantity"] <= s.get("low_stock_alert", 10)]
    resp = paginated_response(items, total, page, per_page, "Estoque carregado")
    resp["low_stock_count"] = len(low_stock)
    return resp


@router.post("/stock")
def admin_create_stock(req: AdminStockUpdateRequest, user: dict = Depends(require_admin)):
    entry = {
        "id": f"stock-{uuid.uuid4().hex[:8]}", "product_id": req.product_id,
        "product_name": req.product_name or "", "ean": req.ean or "",
        "quantity": req.quantity, "low_stock_alert": req.low_stock_alert,
        "warehouse": req.warehouse, "last_updated": datetime.now(timezone.utc).isoformat(),
    }
    admin_stock_db.append(entry)
    log_activity(user["id"], user["name"], "stock_create", f"Estoque criado: {req.product_name}")
    return success_response(data={"entry": entry}, message="Registro de estoque criado")


@router.put("/stock/{stock_id}")
def admin_update_stock(stock_id: str, req: AdminStockUpdateRequest, user: dict = Depends(require_admin)):
    for s in admin_stock_db:
        if s["id"] == stock_id:
            s["quantity"] = req.quantity
            s["low_stock_alert"] = req.low_stock_alert
            s["warehouse"] = req.warehouse
            if req.product_name:
                s["product_name"] = req.product_name
            s["last_updated"] = datetime.now(timezone.utc).isoformat()
            log_activity(user["id"], user["name"], "stock_update", f"Estoque atualizado: {s['product_name']} -> {req.quantity}")
            return success_response(data={"entry": s}, message="Estoque atualizado")
    raise HTTPException(status_code=404, detail="Registro de estoque nao encontrado")


@router.delete("/stock/{stock_id}")
def admin_delete_stock(stock_id: str, user: dict = Depends(require_admin)):
    for i, s in enumerate(admin_stock_db):
        if s["id"] == stock_id:
            removed = admin_stock_db.pop(i)
            log_activity(user["id"], user["name"], "stock_delete", f"Estoque removido: {removed['product_name']}")
            return success_response(message="Registro removido")
    raise HTTPException(status_code=404, detail="Registro de estoque nao encontrado")


# ============================================================
# IMAGE MANAGEMENT (with pagination/search/filters)
# ============================================================
@router.get("/images")
def admin_list_images(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    type_filter: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "desc",
):
    filters = {}
    if type_filter:
        filters["type"] = type_filter
    items, total = apply_pagination(
        admin_images_db, page=page, per_page=per_page,
        search=search, search_fields=["name", "product_name"],
        sort_by=sort_by or "created_at", sort_dir=sort_dir,
        filters=filters,
    )
    return paginated_response(items, total, page, per_page, "Imagens carregadas")


@router.post("/images")
def admin_create_image(req: AdminImageRequest, user: dict = Depends(require_admin)):
    img = {
        "id": f"img-{uuid.uuid4().hex[:8]}", "name": req.name, "url": req.url,
        "product_id": req.product_id, "product_name": req.product_name,
        "type": req.type, "size": 0, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    admin_images_db.append(img)
    log_activity(user["id"], user["name"], "image_create", f"Imagem adicionada: {req.name}")
    return success_response(data={"image": img}, message="Imagem adicionada com sucesso")


@router.put("/images/{image_id}")
def admin_update_image(image_id: str, req: AdminImageRequest, user: dict = Depends(require_admin)):
    for img in admin_images_db:
        if img["id"] == image_id:
            img["name"] = req.name
            img["url"] = req.url
            img["product_id"] = req.product_id
            img["product_name"] = req.product_name
            img["type"] = req.type
            log_activity(user["id"], user["name"], "image_update", f"Imagem atualizada: {req.name}")
            return success_response(data={"image": img}, message="Imagem atualizada")
    raise HTTPException(status_code=404, detail="Imagem nao encontrada")


@router.delete("/images/{image_id}")
def admin_delete_image(image_id: str, user: dict = Depends(require_admin)):
    for i, img in enumerate(admin_images_db):
        if img["id"] == image_id:
            removed = admin_images_db.pop(i)
            log_activity(user["id"], user["name"], "image_delete", f"Imagem removida: {removed['name']}")
            return success_response(message="Imagem removida")
    raise HTTPException(status_code=404, detail="Imagem nao encontrada")


# ============================================================
# INTEGRATION MANAGEMENT (with pagination)
# ============================================================
@router.get("/integrations")
def admin_list_integrations(
    user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
):
    safe_list = []
    for ig in admin_integrations_db:
        safe = {**ig}
        if safe.get("api_key"):
            key = safe["api_key"]
            safe["api_key_masked"] = key[:3] + "***" + key[-3:] if len(key) > 6 else "***"
            del safe["api_key"]
        else:
            safe["api_key_masked"] = ""
        safe_list.append(safe)
    items, total = apply_pagination(
        safe_list, page=page, per_page=per_page,
        search=search, search_fields=["name", "type", "description"],
    )
    return paginated_response(items, total, page, per_page, "Integracoes carregadas")


@router.post("/integrations")
def admin_create_integration(req: AdminIntegrationRequest, user: dict = Depends(require_admin)):
    ig = {
        "id": f"int-{uuid.uuid4().hex[:8]}", "name": req.name, "type": req.type,
        "api_url": req.api_url, "api_key": req.api_key,
        "description": req.description, "active": req.active,
        "status": "connected" if req.active else "disconnected",
        "last_sync": datetime.now(timezone.utc).isoformat() if req.active else None,
    }
    admin_integrations_db.append(ig)
    log_activity(user["id"], user["name"], "integration_create", f"Integracao criada: {req.name}")
    return success_response(data={"integration": ig}, message="Integracao criada com sucesso")


@router.put("/integrations/{integration_id}")
def admin_update_integration(integration_id: str, req: AdminIntegrationRequest, user: dict = Depends(require_admin)):
    for ig in admin_integrations_db:
        if ig["id"] == integration_id:
            ig["name"] = req.name
            ig["type"] = req.type
            ig["api_url"] = req.api_url
            if req.api_key:
                ig["api_key"] = req.api_key
            ig["description"] = req.description
            ig["active"] = req.active
            ig["status"] = "connected" if req.active else "disconnected"
            if req.active:
                ig["last_sync"] = datetime.now(timezone.utc).isoformat()
            log_activity(user["id"], user["name"], "integration_update", f"Integracao atualizada: {req.name}")
            return success_response(data={"integration": ig}, message="Integracao atualizada")
    raise HTTPException(status_code=404, detail="Integracao nao encontrada")


@router.patch("/integrations/{integration_id}/toggle")
def admin_toggle_integration(integration_id: str, user: dict = Depends(require_admin)):
    for ig in admin_integrations_db:
        if ig["id"] == integration_id:
            ig["active"] = not ig["active"]
            ig["status"] = "connected" if ig["active"] else "disconnected"
            if ig["active"]:
                ig["last_sync"] = datetime.now(timezone.utc).isoformat()
            st = "ativada" if ig["active"] else "desativada"
            log_activity(user["id"], user["name"], "integration_toggle", f"Integracao {st}: {ig['name']}")
            return success_response(data={"integration": ig}, message=f"Integracao {st}")
    raise HTTPException(status_code=404, detail="Integracao nao encontrada")


@router.delete("/integrations/{integration_id}")
def admin_delete_integration(integration_id: str, user: dict = Depends(require_admin)):
    for i, ig in enumerate(admin_integrations_db):
        if ig["id"] == integration_id:
            removed = admin_integrations_db.pop(i)
            log_activity(user["id"], user["name"], "integration_delete", f"Integracao removida: {removed['name']}")
            return success_response(message="Integracao removida")
    raise HTTPException(status_code=404, detail="Integracao nao encontrada")


# ============================================================
# CHALLENGE MANAGEMENT (admin create)
# ============================================================
@router.post("/challenges")
def create_challenge(req: ChallengeCreateRequest, user: dict = Depends(require_admin)):
    challenge_id = f"challenge-{uuid.uuid4().hex[:8]}"
    challenge = {
        "id": challenge_id, "title": req.title, "description": req.description,
        "type": req.type, "reward_kit_id": req.reward_kit_id,
        "points_reward": req.points_reward, "goal": req.goal, "active": True,
        "start_date": req.start_date, "end_date": req.end_date, "created_by": user["id"],
    }
    challenges_db.append(challenge)
    log_activity(user["id"], user["name"], "challenge_create", f"Desafio criado: {req.title}")
    return success_response(data={"challenge": challenge}, message="Desafio criado com sucesso")
