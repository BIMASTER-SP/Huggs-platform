from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
import uuid
import random
import re
import jwt
import bcrypt
import os

# ============================================================
# APP SETUP
# ============================================================
app = FastAPI(title="Ruby Rose Cashback API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.environ.get("JWT_SECRET", "rubyrose-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer(auto_error=False)

# ============================================================
# IN-MEMORY DATABASE (ready for SQLite migration)
# ============================================================
users_db: dict[str, dict] = {}
receipts_db: list[dict] = []
banners_db: list[dict] = []
integrations_stock_db: list[dict] = []
integrations_catalog_db: list[dict] = []
integrations_prices_db: list[dict] = []
integrations_promotions_db: list[dict] = []
lgpd_consents_db: dict[str, dict] = {}
webhooks_db: list[dict] = []

# Seed default admin user
_admin_pw = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
users_db["admin@rubyrose.com.br"] = {
    "id": "admin-001",
    "name": "Admin Ruby Rose",
    "email": "admin@rubyrose.com.br",
    "cpf": "000.000.000-00",
    "password_hash": _admin_pw,
    "role": "admin",
    "points": 0,
    "cashback_balance": 0.0,
    "total_cashback_earned": 0.0,
    "receipts_count": 0,
    "level": "Admin",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "lgpd_consent": True,
    "lgpd_consent_date": datetime.now(timezone.utc).isoformat(),
}

# Seed default consumer user
_consumer_pw = bcrypt.hashpw("maria123".encode(), bcrypt.gensalt()).decode()
users_db["maria@email.com"] = {
    "id": "user-001",
    "name": "Maria Silva",
    "email": "maria@email.com",
    "cpf": "***.***.***-45",
    "password_hash": _consumer_pw,
    "role": "consumer",
    "points": 2850,
    "cashback_balance": 47.90,
    "total_cashback_earned": 234.50,
    "receipts_count": 18,
    "level": "Ouro",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "lgpd_consent": True,
    "lgpd_consent_date": datetime.now(timezone.utc).isoformat(),
}

# Seed default banners (differentiated from Meliuz)
banners_db.extend([
    {
        "id": "banner-001",
        "title": "Cashback de Boas-vindas",
        "subtitle": "Na sua primeira compra Ruby Rose",
        "description": "Ate R$30 de volta",
        "image_url": None,
        "color": "purple",
        "highlight": True,
        "position": 1,
        "active": True,
        "start_date": "2026-01-01T00:00:00",
        "end_date": "2026-12-31T23:59:59",
        "created_by": "admin-001",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "banner-002",
        "title": "Semana Skincare",
        "subtitle": "Ate 30% de retorno",
        "description": "Valido esta semana",
        "image_url": None,
        "color": "pink",
        "highlight": False,
        "position": 2,
        "active": True,
        "start_date": "2026-03-01T00:00:00",
        "end_date": "2026-03-31T23:59:59",
        "created_by": "admin-001",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "banner-003",
        "title": "Especial Beauty",
        "subtitle": "Pontos em dobro",
        "description": "Promocao limitada",
        "image_url": None,
        "color": "rose",
        "highlight": False,
        "position": 3,
        "active": True,
        "start_date": "2026-03-01T00:00:00",
        "end_date": "2026-03-31T23:59:59",
        "created_by": "admin-001",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
])

RUBY_ROSE_PRODUCTS = {
    "7896522800012": {"name": "Base Liquida HD Ruby Rose", "category": "Maquiagem", "cashback_percent": 15},
    "7896522800029": {"name": "Paleta de Sombras 18 Cores", "category": "Maquiagem", "cashback_percent": 20},
    "7896522800036": {"name": "Batom Matte Longa Duracao", "category": "Maquiagem", "cashback_percent": 25},
    "7896522800043": {"name": "Mascara de Cilios Volume Max", "category": "Maquiagem", "cashback_percent": 10},
    "7896522800050": {"name": "Po Compacto HD", "category": "Maquiagem", "cashback_percent": 12},
    "7896522800067": {"name": "Primer Facial Hidratante", "category": "Skincare", "cashback_percent": 18},
    "7896522800074": {"name": "Serum Vitamina C", "category": "Skincare", "cashback_percent": 30},
    "7896522800081": {"name": "Agua Micelar 200ml", "category": "Skincare", "cashback_percent": 15},
    "7896522800098": {"name": "Kit Pinceis Maquiagem 12pcs", "category": "Acessorios", "cashback_percent": 20},
    "7896522800104": {"name": "Esmalte Gel Ruby Rose", "category": "Unhas", "cashback_percent": 50},
    "7896522800111": {"name": "Lip Gloss Volumizador", "category": "Maquiagem", "cashback_percent": 22},
    "7896522800128": {"name": "Corretivo Liquido HD", "category": "Maquiagem", "cashback_percent": 15},
}

PRODUCTS_LIST = [
    {"id": 1, "name": "Base Liquida HD Ruby Rose", "image": "base", "price": 39.90, "cashback_percent": 15, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 2},
    {"id": 2, "name": "Paleta de Sombras 18 Cores", "image": "paleta", "price": 49.90, "cashback_percent": 20, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 1},
    {"id": 3, "name": "Batom Matte Longa Duracao", "image": "batom", "price": 19.90, "cashback_percent": 25, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 3},
    {"id": 4, "name": "Mascara de Cilios Volume Max", "image": "mascara", "price": 29.90, "cashback_percent": 10, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 2},
    {"id": 5, "name": "Po Compacto HD", "image": "po", "price": 25.90, "cashback_percent": 12, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 2},
    {"id": 6, "name": "Primer Facial Hidratante", "image": "primer", "price": 34.90, "cashback_percent": 18, "category": "Skincare", "brand": "Ruby Rose", "max_per_person": 1},
    {"id": 7, "name": "Serum Vitamina C", "image": "serum", "price": 44.90, "cashback_percent": 30, "category": "Skincare", "brand": "Ruby Rose", "max_per_person": 1},
    {"id": 8, "name": "Agua Micelar 200ml", "image": "micelar", "price": 22.90, "cashback_percent": 15, "category": "Skincare", "brand": "Ruby Rose", "max_per_person": 2},
    {"id": 9, "name": "Kit Pinceis Maquiagem 12pcs", "image": "pinceis", "price": 59.90, "cashback_percent": 20, "category": "Acessorios", "brand": "Ruby Rose", "max_per_person": 1},
    {"id": 10, "name": "Esmalte Gel Ruby Rose", "image": "esmalte", "price": 12.90, "cashback_percent": 50, "category": "Unhas", "brand": "Ruby Rose", "max_per_person": 5},
    {"id": 11, "name": "Lip Gloss Volumizador", "image": "gloss", "price": 24.90, "cashback_percent": 22, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 2},
    {"id": 12, "name": "Corretivo Liquido HD", "image": "corretivo", "price": 18.90, "cashback_percent": 15, "category": "Maquiagem", "brand": "Ruby Rose", "max_per_person": 2},
]


# ============================================================
# AUTH HELPERS
# ============================================================
def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    email = payload.get("email")
    if not email:
        return None
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    return user


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Autenticacao necessaria")
    payload = decode_token(credentials.credentials)
    email = payload.get("email")
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    return user


def require_admin(user: dict = Depends(require_auth)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


def require_role(allowed_roles: list[str]):
    def _check(user: dict = Depends(require_auth)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Acesso negado para este perfil")
        return user
    return _check


def safe_user_response(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password_hash"}


# ============================================================
# REQUEST MODELS
# ============================================================
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    cpf: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class CupomLookupRequest(BaseModel):
    access_key: str

class QRCodeScanRequest(BaseModel):
    qr_data: str

class BannerCreateRequest(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    color: Optional[str] = "purple"
    highlight: bool = False
    position: int = 1
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class BannerUpdateRequest(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    color: Optional[str] = None
    highlight: Optional[bool] = None
    position: Optional[int] = None
    active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class StockUpdateRequest(BaseModel):
    product_ean: str
    quantity: int
    warehouse: Optional[str] = "principal"

class CatalogItemRequest(BaseModel):
    ean: str
    name: str
    category: str
    brand: str
    price: float
    cashback_percent: float = 0.0
    description: Optional[str] = None
    image_url: Optional[str] = None

class PriceUpdateRequest(BaseModel):
    product_id: int
    new_price: float
    effective_date: Optional[str] = None

class PromotionRequest(BaseModel):
    name: str
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    cashback_bonus: Optional[float] = None
    product_ids: Optional[list[int]] = None
    start_date: str
    end_date: str
    active: bool = True

class LGPDConsentRequest(BaseModel):
    consent_data_collection: bool
    consent_marketing: bool = False
    consent_third_party: bool = False

class WebhookRegisterRequest(BaseModel):
    url: str
    events: list[str]
    secret: Optional[str] = None
    description: Optional[str] = None


# ============================================================
# NFE SIMULATION
# ============================================================
def simulate_nfe_lookup(access_key: str) -> dict:
    clean_key = re.sub(r"\D", "", access_key)
    store_names = ["Beleza Web", "GlamShop", "Beauty Box", "Rede Farma", "Perfumaria Central", "MakeB Store", "Make & Cia", "Farmacia Popular"]
    all_products = list(RUBY_ROSE_PRODUCTS.items())
    selected_rr = random.sample(all_products, min(random.randint(1, 4), len(all_products)))
    other_products = [
        {"ean": "7891000100103", "name": "Leite Integral 1L", "quantity": 2, "unit_price": 5.49, "total": 10.98, "is_ruby_rose": False, "cashback_percent": 0},
        {"ean": "7891910000197", "name": "Arroz Tipo 1 5kg", "quantity": 1, "unit_price": 22.90, "total": 22.90, "is_ruby_rose": False, "cashback_percent": 0},
        {"ean": "7891024134900", "name": "Creme Dental 90g", "quantity": 1, "unit_price": 8.90, "total": 8.90, "is_ruby_rose": False, "cashback_percent": 0},
    ]
    items: list[dict] = []
    total_value = 0.0
    cashback_total = 0.0
    for ean, product in selected_rr:
        qty = random.randint(1, 3)
        price = round(random.uniform(12.90, 59.90), 2)
        item_total = round(qty * price, 2)
        cv = round(item_total * product["cashback_percent"] / 100, 2)
        total_value += item_total
        cashback_total += cv
        items.append({"ean": ean, "name": product["name"], "quantity": qty, "unit_price": price, "total": item_total, "is_ruby_rose": True, "cashback_percent": product["cashback_percent"], "cashback_value": cv, "category": product["category"]})
    for prod in random.sample(other_products, min(random.randint(1, 2), len(other_products))):
        total_value += prod["total"]
        items.append(prod)
    total_value = round(total_value, 2)
    cashback_total = round(cashback_total, 2)
    store = random.choice(store_names)
    city = random.choice(["Sao Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba"])
    state = random.choice(["SP", "RJ", "MG", "PR"])
    return {
        "access_key": clean_key if len(clean_key) == 44 else access_key,
        "status": "authorized",
        "nfe_number": random.randint(100000, 999999),
        "emission_date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
        "store": {"name": store, "cnpj": f"{random.randint(10,99)}.{random.randint(100,999)}.{random.randint(100,999)}/0001-{random.randint(10,99)}", "city": city, "state": state},
        "items": items,
        "total_items": len(items),
        "total_value": total_value,
        "ruby_rose_items": len([i for i in items if i.get("is_ruby_rose")]),
        "cashback_total": cashback_total,
        "points_earned": int(cashback_total * 10),
        "payment_method": random.choice(["Cartao Credito", "Cartao Debito", "PIX", "Dinheiro"]),
    }


def _process_nfe(nfe_data: dict, source: str = "manual", user_email: Optional[str] = None) -> dict:
    receipt_id = str(uuid.uuid4())[:8]
    receipt = {
        "id": receipt_id,
        "user_email": user_email,
        "access_key": nfe_data["access_key"],
        "source": source,
        "status": "approved" if nfe_data["ruby_rose_items"] > 0 else "no_products",
        "nfe_number": nfe_data["nfe_number"],
        "store": nfe_data["store"],
        "items": nfe_data["items"],
        "total_items": nfe_data["total_items"],
        "total_value": nfe_data["total_value"],
        "ruby_rose_items": nfe_data["ruby_rose_items"],
        "cashback_total": nfe_data["cashback_total"],
        "points_earned": nfe_data["points_earned"],
        "payment_method": nfe_data["payment_method"],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "emission_date": nfe_data["emission_date"],
    }
    receipts_db.append(receipt)
    if user_email and user_email in users_db and nfe_data["ruby_rose_items"] > 0:
        users_db[user_email]["points"] += nfe_data["points_earned"]
        users_db[user_email]["cashback_balance"] = round(users_db[user_email]["cashback_balance"] + nfe_data["cashback_total"], 2)
        users_db[user_email]["total_cashback_earned"] = round(users_db[user_email]["total_cashback_earned"] + nfe_data["cashback_total"], 2)
        users_db[user_email]["receipts_count"] += 1
    return receipt


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/healthz")
async def healthz():
    return {"status": "ok", "version": "2.0.0"}


# ============================================================
# AUTH ENDPOINTS
# ============================================================
@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    if request.email in users_db:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user-{str(uuid.uuid4())[:8]}"
    users_db[request.email] = {
        "id": user_id,
        "name": request.name,
        "email": request.email,
        "cpf": request.cpf or "",
        "password_hash": password_hash,
        "role": "consumer",
        "points": 0,
        "cashback_balance": 0.0,
        "total_cashback_earned": 0.0,
        "receipts_count": 0,
        "level": "Bronze",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lgpd_consent": False,
        "lgpd_consent_date": None,
    }
    token = create_token(user_id, request.email, "consumer")
    return {"token": token, "user": safe_user_response(users_db[request.email])}


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    user = users_db.get(request.email)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    if not bcrypt.checkpw(request.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_token(user["id"], request.email, user["role"])
    return {"token": token, "user": safe_user_response(user)}


@app.get("/api/auth/me")
async def get_me(user: dict = Depends(require_auth)):
    return safe_user_response(user)


# ============================================================
# PUBLIC DATA ENDPOINTS (no auth required, fallback for demo)
# ============================================================
@app.get("/api/user")
async def get_user(current_user: Optional[dict] = Depends(get_current_user)):
    if current_user:
        return safe_user_response(current_user)
    return safe_user_response(users_db["maria@email.com"])


@app.get("/api/products")
async def get_products(category: Optional[str] = None):
    products = PRODUCTS_LIST.copy()
    if category and category != "Todas":
        if category == "Super Cashback":
            products = [p for p in products if p["cashback_percent"] >= 20]
        else:
            products = [p for p in products if p["category"] == category]
    return products


@app.get("/api/categories")
async def get_categories():
    return ["Todas", "Super Cashback", "Maquiagem", "Skincare", "Unhas", "Acessorios"]


@app.get("/api/offers")
async def get_offers():
    now = datetime.now(timezone.utc).isoformat()
    active_banners = [
        {
            "id": b["id"],
            "title": b["title"],
            "subtitle": b["subtitle"],
            "description": b["description"],
            "image_url": b.get("image_url"),
            "color": b["color"],
            "highlight": b["highlight"],
        }
        for b in sorted(banners_db, key=lambda x: x["position"])
        if b["active"] and (not b.get("start_date") or b["start_date"] <= now)
        and (not b.get("end_date") or b["end_date"] >= now)
    ]
    return {"banners": active_banners}


@app.get("/api/services")
async def get_services():
    return [
        {"id": 1, "name": "Quiz Beauty", "icon": "gamepad", "badge": "NOVO", "badge_color": "green"},
        {"id": 2, "name": "Clube VIP", "icon": "diamond", "badge": None, "badge_color": None},
        {"id": 3, "name": "Premios", "icon": "gift", "badge": "ESPECIAL", "badge_color": "pink"},
        {"id": 4, "name": "Convide Amigas", "icon": "users", "badge": None, "badge_color": None},
    ]


@app.get("/api/rewards")
async def get_rewards():
    return [
        {"id": 1, "name": "Desconto 15% na proxima compra", "points_required": 200, "type": "discount", "icon": "percent", "available": True},
        {"id": 2, "name": "Frete Gratis", "points_required": 300, "type": "shipping", "icon": "truck", "available": True},
        {"id": 3, "name": "Kit Miniatura Exclusivo", "points_required": 500, "type": "product", "icon": "gift", "available": True},
        {"id": 4, "name": "Cashback R$10", "points_required": 350, "type": "cashback", "icon": "dollar-sign", "available": True},
        {"id": 5, "name": "Sorteio Viagem Spa", "points_required": 100, "type": "raffle", "icon": "star", "available": True},
        {"id": 6, "name": "Paleta Exclusiva Edicao Limitada", "points_required": 1000, "type": "product", "icon": "palette", "available": True},
    ]


@app.get("/api/missions")
async def get_missions():
    return [
        {"id": 1, "name": "Envie 3 cupons fiscais", "description": "Envie 3 cupons fiscais esta semana", "points_reward": 100, "progress": 1, "total": 3, "type": "receipt"},
        {"id": 2, "name": "Compre produtos Skincare", "description": "Compre qualquer produto da linha Skincare", "points_reward": 150, "progress": 0, "total": 1, "type": "purchase"},
        {"id": 3, "name": "Convide uma amiga", "description": "Convide uma amiga para usar o app", "points_reward": 200, "progress": 0, "total": 1, "type": "referral"},
        {"id": 4, "name": "Cashback semanal", "description": "Acumule R$20 em cashback esta semana", "points_reward": 50, "progress": 12, "total": 20, "type": "cashback"},
    ]


# ============================================================
# CUPOM FISCAL ENDPOINTS
# ============================================================
@app.post("/api/cupom/lookup")
async def lookup_cupom(request: CupomLookupRequest, current_user: Optional[dict] = Depends(get_current_user)):
    nfe_data = simulate_nfe_lookup(request.access_key)
    user_email = current_user["email"] if current_user else "maria@email.com"
    receipt = _process_nfe(nfe_data, "manual", user_email)
    rr = nfe_data["ruby_rose_items"]
    msg = f"Cupom processado! {rr} produto(s) Ruby Rose encontrado(s)."
    return {"receipt": receipt, "message": msg, "cashback_earned": nfe_data["cashback_total"], "points_earned": nfe_data["points_earned"]}


@app.post("/api/cupom/qrcode")
async def scan_qrcode(request: QRCodeScanRequest, current_user: Optional[dict] = Depends(get_current_user)):
    qr_data = request.qr_data
    access_key = ""
    if "chNFe=" in qr_data:
        match = re.search(r"chNFe=(\d{44})", qr_data)
        if match:
            access_key = match.group(1)
        else:
            access_key = qr_data
    elif len(re.sub(r"\D", "", qr_data)) >= 44:
        access_key = re.sub(r"\D", "", qr_data)[:44]
    else:
        access_key = qr_data
    nfe_data = simulate_nfe_lookup(access_key)
    user_email = current_user["email"] if current_user else "maria@email.com"
    receipt = _process_nfe(nfe_data, "qrcode", user_email)
    rr = nfe_data["ruby_rose_items"]
    msg = f"QR Code processado! {rr} produto(s) Ruby Rose encontrado(s)."
    return {"receipt": receipt, "message": msg, "cashback_earned": nfe_data["cashback_total"], "points_earned": nfe_data["points_earned"]}


@app.get("/api/receipts")
async def get_receipts(current_user: Optional[dict] = Depends(get_current_user)):
    user_email = current_user["email"] if current_user else "maria@email.com"
    user_receipts = [r for r in receipts_db if r.get("user_email") == user_email]
    return {
        "receipts": user_receipts,
        "stats": {
            "total": len(user_receipts),
            "pending": len([r for r in user_receipts if r.get("status") == "pending"]),
            "approved": len([r for r in user_receipts if r.get("status") == "approved"]),
            "cashback_total": sum(r.get("cashback_total", 0) for r in user_receipts if r.get("status") == "approved"),
        },
    }


# ============================================================
# BANNER MANAGEMENT (Admin only)
# ============================================================
@app.get("/api/admin/banners")
async def list_banners(admin: dict = Depends(require_admin)):
    return {"banners": sorted(banners_db, key=lambda x: x["position"]), "total": len(banners_db)}


@app.post("/api/admin/banners")
async def create_banner(request: BannerCreateRequest, admin: dict = Depends(require_admin)):
    banner_id = f"banner-{str(uuid.uuid4())[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    banner = {
        "id": banner_id,
        "title": request.title,
        "subtitle": request.subtitle,
        "description": request.description,
        "image_url": request.image_url,
        "image_base64": request.image_base64,
        "color": request.color,
        "highlight": request.highlight,
        "position": request.position,
        "active": request.active,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "created_by": admin["id"],
        "created_at": now,
        "updated_at": now,
    }
    banners_db.append(banner)
    return {"banner": banner, "message": "Banner criado com sucesso"}


@app.put("/api/admin/banners/{banner_id}")
async def update_banner(banner_id: str, request: BannerUpdateRequest, admin: dict = Depends(require_admin)):
    banner = next((b for b in banners_db if b["id"] == banner_id), None)
    if not banner:
        raise HTTPException(status_code=404, detail="Banner nao encontrado")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            banner[key] = value
    banner["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"banner": banner, "message": "Banner atualizado com sucesso"}


@app.delete("/api/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, admin: dict = Depends(require_admin)):
    idx = next((i for i, b in enumerate(banners_db) if b["id"] == banner_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Banner nao encontrado")
    removed = banners_db.pop(idx)
    return {"message": "Banner removido com sucesso", "banner_id": removed["id"]}


@app.patch("/api/admin/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: str, admin: dict = Depends(require_admin)):
    banner = next((b for b in banners_db if b["id"] == banner_id), None)
    if not banner:
        raise HTTPException(status_code=404, detail="Banner nao encontrado")
    banner["active"] = not banner["active"]
    banner["updated_at"] = datetime.now(timezone.utc).isoformat()
    status = "ativado" if banner["active"] else "desativado"
    return {"banner": banner, "message": f"Banner {status} com sucesso"}


# ============================================================
# EXTERNAL INTEGRATIONS (Admin/Partner)
# ============================================================
@app.get("/api/integrations/stock")
async def get_stock(user: dict = Depends(require_role(["admin", "partner"]))):
    return {"stock": integrations_stock_db, "total": len(integrations_stock_db)}


@app.post("/api/integrations/stock")
async def update_stock(request: StockUpdateRequest, user: dict = Depends(require_role(["admin", "partner"]))):
    entry = {
        "id": str(uuid.uuid4())[:8],
        "product_ean": request.product_ean,
        "quantity": request.quantity,
        "warehouse": request.warehouse,
        "updated_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    existing = next((s for s in integrations_stock_db if s["product_ean"] == request.product_ean and s["warehouse"] == request.warehouse), None)
    if existing:
        existing.update(entry)
    else:
        integrations_stock_db.append(entry)
    return {"stock_entry": entry, "message": "Estoque atualizado com sucesso"}


@app.get("/api/integrations/catalog")
async def get_catalog(user: dict = Depends(require_role(["admin", "partner"]))):
    return {"catalog": integrations_catalog_db + PRODUCTS_LIST, "total": len(integrations_catalog_db) + len(PRODUCTS_LIST)}


@app.post("/api/integrations/catalog")
async def add_catalog_item(request: CatalogItemRequest, user: dict = Depends(require_role(["admin", "partner"]))):
    item = {
        "id": str(uuid.uuid4())[:8],
        "ean": request.ean,
        "name": request.name,
        "category": request.category,
        "brand": request.brand,
        "price": request.price,
        "cashback_percent": request.cashback_percent,
        "description": request.description,
        "image_url": request.image_url,
        "added_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_catalog_db.append(item)
    return {"catalog_item": item, "message": "Item adicionado ao catalogo"}


@app.get("/api/integrations/prices")
async def get_prices(user: dict = Depends(require_role(["admin", "partner"]))):
    return {"prices": integrations_prices_db, "products": [{"id": p["id"], "name": p["name"], "current_price": p["price"]} for p in PRODUCTS_LIST]}


@app.put("/api/integrations/prices")
async def update_price(request: PriceUpdateRequest, user: dict = Depends(require_role(["admin", "partner"]))):
    entry = {
        "id": str(uuid.uuid4())[:8],
        "product_id": request.product_id,
        "new_price": request.new_price,
        "effective_date": request.effective_date or datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_prices_db.append(entry)
    product = next((p for p in PRODUCTS_LIST if p["id"] == request.product_id), None)
    if product:
        product["price"] = request.new_price
    return {"price_update": entry, "message": "Preco atualizado com sucesso"}


@app.get("/api/integrations/promotions")
async def get_promotions(user: dict = Depends(require_role(["admin", "partner"]))):
    return {"promotions": integrations_promotions_db, "total": len(integrations_promotions_db)}


@app.post("/api/integrations/promotions")
async def create_promotion(request: PromotionRequest, user: dict = Depends(require_role(["admin", "partner"]))):
    promo = {
        "id": str(uuid.uuid4())[:8],
        "name": request.name,
        "description": request.description,
        "discount_percent": request.discount_percent,
        "cashback_bonus": request.cashback_bonus,
        "product_ids": request.product_ids or [],
        "start_date": request.start_date,
        "end_date": request.end_date,
        "active": request.active,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_promotions_db.append(promo)
    return {"promotion": promo, "message": "Promocao criada com sucesso"}


@app.put("/api/integrations/promotions/{promo_id}")
async def update_promotion(promo_id: str, request: PromotionRequest, user: dict = Depends(require_role(["admin", "partner"]))):
    promo = next((p for p in integrations_promotions_db if p["id"] == promo_id), None)
    if not promo:
        raise HTTPException(status_code=404, detail="Promocao nao encontrada")
    promo.update({
        "name": request.name,
        "description": request.description,
        "discount_percent": request.discount_percent,
        "cashback_bonus": request.cashback_bonus,
        "product_ids": request.product_ids or [],
        "start_date": request.start_date,
        "end_date": request.end_date,
        "active": request.active,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"promotion": promo, "message": "Promocao atualizada com sucesso"}


@app.delete("/api/integrations/promotions/{promo_id}")
async def delete_promotion(promo_id: str, user: dict = Depends(require_role(["admin", "partner"]))):
    idx = next((i for i, p in enumerate(integrations_promotions_db) if p["id"] == promo_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Promocao nao encontrada")
    removed = integrations_promotions_db.pop(idx)
    return {"message": "Promocao removida com sucesso", "promotion_id": removed["id"]}


# Webhook registration
@app.get("/api/integrations/webhooks")
async def list_webhooks(user: dict = Depends(require_admin)):
    return {"webhooks": webhooks_db, "total": len(webhooks_db)}


@app.post("/api/integrations/webhooks")
async def register_webhook(request: WebhookRegisterRequest, user: dict = Depends(require_admin)):
    webhook = {
        "id": str(uuid.uuid4())[:8],
        "url": request.url,
        "events": request.events,
        "secret": request.secret,
        "description": request.description,
        "active": True,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    webhooks_db.append(webhook)
    return {"webhook": webhook, "message": "Webhook registrado com sucesso"}


@app.delete("/api/integrations/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, user: dict = Depends(require_admin)):
    idx = next((i for i, w in enumerate(webhooks_db) if w["id"] == webhook_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Webhook nao encontrado")
    removed = webhooks_db.pop(idx)
    return {"message": "Webhook removido com sucesso", "webhook_id": removed["id"]}


# ============================================================
# LGPD COMPLIANCE
# ============================================================
@app.get("/api/lgpd/privacy-policy")
async def get_privacy_policy():
    return {
        "title": "Politica de Privacidade - Ruby Rose Cashback",
        "version": "1.0",
        "last_updated": "2026-03-01",
        "sections": [
            {
                "title": "1. Coleta de Dados",
                "content": "Coletamos dados pessoais como nome, email, CPF e historico de compras exclusivamente para o funcionamento do programa de cashback Ruby Rose. Os dados sao coletados mediante consentimento expresso do usuario."
            },
            {
                "title": "2. Uso dos Dados",
                "content": "Seus dados sao utilizados para: processamento de cashback, identificacao de produtos Ruby Rose em cupons fiscais, calculo de pontos e recompensas, e comunicacoes sobre ofertas e promocoes (mediante consentimento)."
            },
            {
                "title": "3. Compartilhamento",
                "content": "Nao compartilhamos seus dados pessoais com terceiros sem seu consentimento expresso, exceto quando exigido por lei ou para processamento de transacoes financeiras (ex: transferencias Pix)."
            },
            {
                "title": "4. Armazenamento e Seguranca",
                "content": "Seus dados sao armazenados em servidores seguros com criptografia. Mantemos seus dados apenas pelo periodo necessario para o funcionamento do servico ou conforme exigido por lei."
            },
            {
                "title": "5. Seus Direitos (LGPD Art. 18)",
                "content": "Voce tem direito a: confirmacao da existencia de tratamento, acesso aos dados, correcao de dados incompletos ou desatualizados, anonimizacao, bloqueio ou eliminacao de dados desnecessarios, portabilidade dos dados, eliminacao dos dados pessoais tratados com consentimento, e revogacao do consentimento."
            },
            {
                "title": "6. Exclusao de Dados",
                "content": "Voce pode solicitar a exclusao completa dos seus dados a qualquer momento atraves do app ou entrando em contato com nosso DPO."
            },
            {
                "title": "7. Contato",
                "content": "Para questoes sobre privacidade, entre em contato: dpo@rubyrose.com.br"
            },
        ],
    }


@app.post("/api/lgpd/consent")
async def submit_consent(request: LGPDConsentRequest, user: dict = Depends(require_auth)):
    now = datetime.now(timezone.utc).isoformat()
    consent_record = {
        "user_id": user["id"],
        "user_email": user["email"],
        "consent_data_collection": request.consent_data_collection,
        "consent_marketing": request.consent_marketing,
        "consent_third_party": request.consent_third_party,
        "consented_at": now,
    }
    lgpd_consents_db[user["email"]] = consent_record
    user["lgpd_consent"] = request.consent_data_collection
    user["lgpd_consent_date"] = now
    return {"consent": consent_record, "message": "Consentimento registrado com sucesso"}


@app.get("/api/lgpd/consent")
async def get_consent(user: dict = Depends(require_auth)):
    consent = lgpd_consents_db.get(user["email"])
    return {"consent": consent, "has_consent": user.get("lgpd_consent", False)}


@app.get("/api/lgpd/user-data")
async def export_user_data(user: dict = Depends(require_auth)):
    user_receipts = [r for r in receipts_db if r.get("user_email") == user["email"]]
    user_consent = lgpd_consents_db.get(user["email"])
    return {
        "user_profile": safe_user_response(user),
        "receipts": user_receipts,
        "consent_records": user_consent,
        "export_date": datetime.now(timezone.utc).isoformat(),
        "format": "JSON",
        "message": "Dados exportados conforme LGPD Art. 18 - Direito a portabilidade",
    }


@app.delete("/api/lgpd/user-data")
async def delete_user_data(user: dict = Depends(require_auth)):
    email = user["email"]
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Nao e possivel excluir conta de administrador")
    global receipts_db
    receipts_db = [r for r in receipts_db if r.get("user_email") != email]
    lgpd_consents_db.pop(email, None)
    users_db.pop(email, None)
    return {
        "message": "Todos os seus dados foram excluidos com sucesso conforme LGPD Art. 18",
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "data_deleted": ["profile", "receipts", "consent_records", "cashback_history"],
    }


# ============================================================
# ADMIN: USER MANAGEMENT
# ============================================================
@app.get("/api/admin/users")
async def list_users(admin: dict = Depends(require_admin)):
    return {"users": [safe_user_response(u) for u in users_db.values()], "total": len(users_db)}


@app.patch("/api/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: dict = Depends(require_admin)):
    if role not in ("consumer", "admin", "partner"):
        raise HTTPException(status_code=400, detail="Perfil invalido. Use: consumer, admin, partner")
    user = next((u for u in users_db.values() if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    user["role"] = role
    return {"user": safe_user_response(user), "message": f"Perfil atualizado para {role}"}
