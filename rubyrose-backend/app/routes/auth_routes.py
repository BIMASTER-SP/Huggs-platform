"""Auth Routes - Registration, Login, Profile"""

from fastapi import APIRouter, Depends, Request
from fastapi import HTTPException
import bcrypt
import uuid
from datetime import datetime, timezone

from app.auth import create_token, require_auth, safe_user_response
from app.config import settings
from app.database import users_db, stores_db
from app.models import RegisterRequest, LoginRequest
from app.rate_limit import limiter
from app.responses import success_response
from app.logger import log_activity

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register")
@limiter.limit(settings.rate_limit_register)
def register(request: Request, req: RegisterRequest):
    if req.email in users_db:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")
    if req.role not in ["promotora", "gerente_loja"]:
        raise HTTPException(status_code=400, detail="Perfil de cadastro invalido. Use: promotora ou gerente_loja")
    if req.role == "promotora" and not req.store_cnpj:
        raise HTTPException(status_code=400, detail="CNPJ da loja e obrigatorio para promotoras")
    if req.store_cnpj and req.store_cnpj not in stores_db:
        raise HTTPException(status_code=400, detail="CNPJ da loja nao encontrado. Solicite o cadastro da sua loja.")
    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    user = {
        "id": user_id, "name": req.name, "email": req.email, "cpf": req.cpf,
        "phone": req.phone, "password_hash": pw_hash, "role": req.role,
        "status": "pendente", "store_cnpj": req.store_cnpj, "points": 0,
        "level": "Bronze", "total_orders": 0, "total_order_value": 0.0,
        "challenges_completed": 0, "receipts_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lgpd_consent": False, "lgpd_consent_date": None,
    }
    users_db[req.email] = user
    token = create_token(user_id, req.email, req.role)
    log_activity("system", "System", "user_register", f"Novo usuario: {req.name} ({req.email})", module="auth")
    return success_response(
        data={"token": token, "user": safe_user_response(user)},
        message="Cadastro realizado! Aguardando aprovacao.",
    )


@router.post("/login")
@limiter.limit(settings.rate_limit_login)
def login(request: Request, req: LoginRequest):
    user = users_db.get(req.email)
    if not user or not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_token(user["id"], req.email, user["role"])
    log_activity(user["id"], user["name"], "user_login", f"Login: {req.email}", module="auth")
    return success_response(
        data={"token": token, "user": safe_user_response(user)},
        message="Login realizado com sucesso",
    )


@router.get("/me")
def get_me(user: dict = Depends(require_auth)):
    store = stores_db.get(user.get("store_cnpj", ""))
    resp = safe_user_response(user)
    if store:
        resp["store_name"] = store["name"]
        resp["store_address"] = store["address"]
        resp["store_city"] = store["city"]
    return success_response(data=resp)
