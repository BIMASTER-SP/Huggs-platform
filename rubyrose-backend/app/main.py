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
app = FastAPI(title="Ruby Rose B2B API", version="3.0.0", description="API para plataforma B2B Ruby Rose - Vendedoras, Promotoras e Lojas Parceiras")

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
stores_db: dict[str, dict] = {}
orders_db: list[dict] = []
challenges_db: list[dict] = []
challenge_submissions_db: list[dict] = []
receipts_db: list[dict] = []
banners_db: list[dict] = []
reward_kits_db: list[dict] = []
redemptions_db: list[dict] = []
lgpd_consents_db: dict[str, dict] = {}
webhooks_db: list[dict] = []
integrations_stock_db: list[dict] = []
integrations_catalog_db: list[dict] = []
integrations_prices_db: list[dict] = []
integrations_promotions_db: list[dict] = []

# ============================================================
# PRODUCT CATALOG (B2B wholesale)
# ============================================================
CATALOG_PRODUCTS = [
    {"id": 1, "ean": "7896522800012", "name": "Base Liquida HD Ruby Rose", "image": "base", "price": 39.90, "category": "Maquiagem", "description": "Base liquida com cobertura HD, acabamento natural", "min_order": 6, "stock_available": True},
    {"id": 2, "ean": "7896522800029", "name": "Paleta de Sombras 18 Cores", "image": "paleta", "price": 49.90, "category": "Maquiagem", "description": "Paleta completa com 18 tons vibrantes", "min_order": 3, "stock_available": True},
    {"id": 3, "ean": "7896522800036", "name": "Batom Matte Longa Duracao", "image": "batom", "price": 19.90, "category": "Maquiagem", "description": "Batom matte com duracao de ate 12 horas", "min_order": 12, "stock_available": True},
    {"id": 4, "ean": "7896522800043", "name": "Mascara de Cilios Volume Max", "image": "mascara", "price": 29.90, "category": "Maquiagem", "description": "Mascara volumizadora com escova de fibra", "min_order": 6, "stock_available": True},
    {"id": 5, "ean": "7896522800050", "name": "Po Compacto HD", "image": "po", "price": 25.90, "category": "Maquiagem", "description": "Po compacto micronizado alta definicao", "min_order": 6, "stock_available": True},
    {"id": 6, "ean": "7896522800067", "name": "Primer Facial Hidratante", "image": "primer", "price": 34.90, "category": "Skincare", "description": "Primer com acido hialuronico e vitamina E", "min_order": 6, "stock_available": True},
    {"id": 7, "ean": "7896522800074", "name": "Serum Vitamina C", "image": "serum", "price": 44.90, "category": "Skincare", "description": "Serum antioxidante com vitamina C pura", "min_order": 6, "stock_available": True},
    {"id": 8, "ean": "7896522800081", "name": "Agua Micelar 200ml", "image": "micelar", "price": 22.90, "category": "Skincare", "description": "Agua micelar para limpeza suave do rosto", "min_order": 12, "stock_available": True},
    {"id": 9, "ean": "7896522800098", "name": "Kit Pinceis Maquiagem 12pcs", "image": "pinceis", "price": 59.90, "category": "Acessorios", "description": "Kit profissional com 12 pinceis sinteticos", "min_order": 3, "stock_available": True},
    {"id": 10, "ean": "7896522800104", "name": "Esmalte Gel Ruby Rose", "image": "esmalte", "price": 12.90, "category": "Unhas", "description": "Esmalte gel com efeito brilhante duradouro", "min_order": 24, "stock_available": True},
    {"id": 11, "ean": "7896522800111", "name": "Lip Gloss Volumizador", "image": "gloss", "price": 24.90, "category": "Maquiagem", "description": "Lip gloss com efeito volumizador e brilho", "min_order": 12, "stock_available": True},
    {"id": 12, "ean": "7896522800128", "name": "Corretivo Liquido HD", "image": "corretivo", "price": 18.90, "category": "Maquiagem", "description": "Corretivo liquido de alta cobertura", "min_order": 12, "stock_available": True},
    {"id": 13, "ean": "7896522800135", "name": "Protetor Solar Facial FPS50", "image": "protetor", "price": 39.90, "category": "Skincare", "description": "Protetor solar com toque seco FPS50", "min_order": 6, "stock_available": True},
    {"id": 14, "ean": "7896522800142", "name": "Demaquilante Bifasico 150ml", "image": "demaquilante", "price": 27.90, "category": "Skincare", "description": "Demaquilante bifasico para olhos e labios", "min_order": 12, "stock_available": True},
    {"id": 15, "ean": "7896522800159", "name": "Paleta de Contorno 6 Cores", "image": "contorno", "price": 42.90, "category": "Maquiagem", "description": "Paleta de contorno e iluminador profissional", "min_order": 3, "stock_available": True},
]

# ============================================================
# REWARD KITS
# ============================================================
reward_kits_db.extend([
    {"id": "kit-001", "name": "Kit Skincare Completo", "description": "Serum + Protetor + Agua Micelar + Demaquilante", "points_cost": 500, "image": "kit_skincare", "products": ["Serum Vitamina C", "Protetor Solar FPS50", "Agua Micelar 200ml", "Demaquilante Bifasico"], "available": True},
    {"id": "kit-002", "name": "Kit Maquiagem Basica", "description": "Base + Po + Batom + Mascara", "points_cost": 350, "image": "kit_maquiagem", "products": ["Base Liquida HD", "Po Compacto HD", "Batom Matte", "Mascara Volume Max"], "available": True},
    {"id": "kit-003", "name": "Kit Profissional Completo", "description": "Paleta Sombras + Paleta Contorno + Kit Pinceis + Primer", "points_cost": 800, "image": "kit_profissional", "products": ["Paleta de Sombras 18 Cores", "Paleta de Contorno", "Kit Pinceis 12pcs", "Primer Facial"], "available": True},
    {"id": "kit-004", "name": "Kit Labios Perfeitos", "description": "3 Batons Matte + 2 Lip Gloss", "points_cost": 250, "image": "kit_labios", "products": ["Batom Matte x3", "Lip Gloss Volumizador x2"], "available": True},
    {"id": "kit-005", "name": "Kit Unhas Glamour", "description": "6 Esmaltes Gel + Removedor + Kit Manicure", "points_cost": 200, "image": "kit_unhas", "products": ["Esmalte Gel x6", "Removedor", "Kit Manicure Basico"], "available": True},
])

# ============================================================
# SEED DATA (bcrypt hashes pre-computed for performance)
# ============================================================
_admin_pw = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
users_db["admin@rubyrose.com.br"] = {
    "id": "admin-001", "name": "Admin Ruby Rose", "email": "admin@rubyrose.com.br",
    "cpf": "000.000.000-00", "phone": "(11) 99999-0000", "password_hash": _admin_pw,
    "role": "admin", "status": "active", "store_cnpj": None, "points": 0, "level": "Admin",
    "total_orders": 0, "total_order_value": 0.0, "challenges_completed": 0, "receipts_count": 0,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "lgpd_consent": True, "lgpd_consent_date": datetime.now(timezone.utc).isoformat(),
}

stores_db["12345678000190"] = {
    "cnpj": "12345678000190", "name": "Perfumaria Bella Vista",
    "address": "Rua das Flores, 123 - Centro", "city": "Sao Paulo", "state": "SP",
    "phone": "(11) 3333-4444", "vendedor_ruby_id": "vendedor-001", "status": "active",
    "created_at": datetime.now(timezone.utc).isoformat(),
}
stores_db["98765432000155"] = {
    "cnpj": "98765432000155", "name": "MakeB Store Shopping Center",
    "address": "Av. Paulista, 1000 - Loja 42", "city": "Sao Paulo", "state": "SP",
    "phone": "(11) 5555-6666", "vendedor_ruby_id": "vendedor-001", "status": "active",
    "created_at": datetime.now(timezone.utc).isoformat(),
}

_vendedor_pw = bcrypt.hashpw("vendedor123".encode(), bcrypt.gensalt()).decode()
users_db["carlos@rubyrose.com.br"] = {
    "id": "vendedor-001", "name": "Carlos Representante", "email": "carlos@rubyrose.com.br",
    "cpf": "111.111.111-11", "phone": "(11) 98888-7777", "password_hash": _vendedor_pw,
    "role": "vendedor_ruby", "status": "active", "store_cnpj": None, "points": 0, "level": "Representante",
    "total_orders": 0, "total_order_value": 0.0, "challenges_completed": 0, "receipts_count": 0,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "lgpd_consent": True, "lgpd_consent_date": datetime.now(timezone.utc).isoformat(),
}

_promotora_pw = bcrypt.hashpw("ana123".encode(), bcrypt.gensalt()).decode()
users_db["ana@email.com"] = {
    "id": "promotora-001", "name": "Ana Souza", "email": "ana@email.com",
    "cpf": "222.222.222-22", "phone": "(11) 97777-6666", "password_hash": _promotora_pw,
    "role": "promotora", "status": "active", "store_cnpj": "12345678000190",
    "points": 1250, "level": "Prata", "total_orders": 8, "total_order_value": 12500.00,
    "challenges_completed": 5, "receipts_count": 23,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "lgpd_consent": True, "lgpd_consent_date": datetime.now(timezone.utc).isoformat(),
}

banners_db.extend([
    {"id": "banner-001", "title": "Nova Linha Skincare 2026", "subtitle": "Conheca os lancamentos e aumente suas vendas", "description": "Treinamento + kit de demonstracao gratis", "image_url": None, "color": "rose", "highlight": True, "position": 1, "active": True, "start_date": "2026-01-01T00:00:00", "end_date": "2026-12-31T23:59:59", "created_by": "admin-001", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
    {"id": "banner-002", "title": "Desafio Vitrine do Mes", "subtitle": "Envie foto da sua vitrine e ganhe um kit", "description": "Valido ate o fim do mes", "image_url": None, "color": "purple", "highlight": False, "position": 2, "active": True, "start_date": "2026-03-01T00:00:00", "end_date": "2026-03-31T23:59:59", "created_by": "admin-001", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
    {"id": "banner-003", "title": "Pontos em Dobro", "subtitle": "Faca pedidos esta semana e ganhe pontos em dobro", "description": "Promocao por tempo limitado", "image_url": None, "color": "emerald", "highlight": False, "position": 3, "active": True, "start_date": "2026-03-01T00:00:00", "end_date": "2026-03-31T23:59:59", "created_by": "admin-001", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
])

challenges_db.extend([
    {"id": "challenge-001", "title": "Vitrine Perfeita", "description": "Envie 4 fotos da sua vitrine Ruby Rose organizada e ganhe um Kit Skincare Completo!", "type": "vitrine", "reward_kit_id": "kit-001", "points_reward": 200, "goal": 4, "active": True, "start_date": "2026-03-01T00:00:00", "end_date": "2026-03-31T23:59:59", "created_by": "admin-001"},
    {"id": "challenge-002", "title": "Meta de Vendas Skincare", "description": "Faca 3 pedidos com produtos da linha Skincare e ganhe um Kit Maquiagem Basica!", "type": "vendas", "reward_kit_id": "kit-002", "points_reward": 150, "goal": 3, "active": True, "start_date": "2026-03-01T00:00:00", "end_date": "2026-03-31T23:59:59", "created_by": "admin-001"},
    {"id": "challenge-003", "title": "Convide uma Amiga", "description": "Indique uma colega vendedora para se cadastrar no app. Ambas ganham pontos!", "type": "social", "reward_kit_id": None, "points_reward": 100, "goal": 1, "active": True, "start_date": "2026-03-01T00:00:00", "end_date": "2026-06-30T23:59:59", "created_by": "admin-001"},
    {"id": "challenge-004", "title": "Registre 5 Cupons", "description": "Escaneie 5 cupons fiscais de vendas Ruby Rose na sua loja e ganhe pontos extras!", "type": "cupons", "reward_kit_id": None, "points_reward": 75, "goal": 5, "active": True, "start_date": "2026-03-01T00:00:00", "end_date": "2026-03-31T23:59:59", "created_by": "admin-001"},
])

orders_db.extend([
    {"id": "order-001", "user_id": "promotora-001", "store_cnpj": "12345678000190", "store_name": "Perfumaria Bella Vista", "items": [{"product_id": 1, "name": "Base Liquida HD Ruby Rose", "quantity": 12, "unit_price": 39.90, "total": 478.80}, {"product_id": 3, "name": "Batom Matte Longa Duracao", "quantity": 24, "unit_price": 19.90, "total": 477.60}, {"product_id": 5, "name": "Po Compacto HD", "quantity": 6, "unit_price": 25.90, "total": 155.40}], "total_value": 1111.80, "points_earned": 55, "status": "entregue", "vendedor_ruby_id": "vendedor-001", "created_at": "2026-02-15T10:30:00", "updated_at": "2026-02-20T14:00:00"},
    {"id": "order-002", "user_id": "promotora-001", "store_cnpj": "12345678000190", "store_name": "Perfumaria Bella Vista", "items": [{"product_id": 7, "name": "Serum Vitamina C", "quantity": 6, "unit_price": 44.90, "total": 269.40}, {"product_id": 8, "name": "Agua Micelar 200ml", "quantity": 12, "unit_price": 22.90, "total": 274.80}], "total_value": 544.20, "points_earned": 27, "status": "em_transito", "vendedor_ruby_id": "vendedor-001", "created_at": "2026-03-08T09:15:00", "updated_at": "2026-03-10T11:00:00"},
])


# ============================================================
# AUTH HELPERS
# ============================================================
def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
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
    phone: Optional[str] = None
    store_cnpj: Optional[str] = None
    role: str = "promotora"

class LoginRequest(BaseModel):
    email: str
    password: str

class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int

class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]

class ChallengeSubmissionRequest(BaseModel):
    challenge_id: str
    photo_url: Optional[str] = None
    photo_base64: Optional[str] = None
    notes: Optional[str] = None

class CupomLookupRequest(BaseModel):
    access_key: str

class QRCodeScanRequest(BaseModel):
    qr_data: str

class RedeemKitRequest(BaseModel):
    kit_id: str
    shipping_address: Optional[str] = None

class BannerCreateRequest(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
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
    color: Optional[str] = None
    highlight: Optional[bool] = None
    position: Optional[int] = None
    active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ChallengeCreateRequest(BaseModel):
    title: str
    description: str
    type: str
    reward_kit_id: Optional[str] = None
    points_reward: int = 100
    goal: int = 1
    start_date: str
    end_date: str

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
    bonus_points: Optional[float] = None
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
# NFE SIMULATION (receipt scanning for B2B sell-out tracking)
# ============================================================
RUBY_ROSE_PRODUCTS_EAN = {
    "7896522800012": {"name": "Base Liquida HD Ruby Rose", "category": "Maquiagem", "points_per_unit": 5},
    "7896522800029": {"name": "Paleta de Sombras 18 Cores", "category": "Maquiagem", "points_per_unit": 8},
    "7896522800036": {"name": "Batom Matte Longa Duracao", "category": "Maquiagem", "points_per_unit": 3},
    "7896522800043": {"name": "Mascara de Cilios Volume Max", "category": "Maquiagem", "points_per_unit": 5},
    "7896522800050": {"name": "Po Compacto HD", "category": "Maquiagem", "points_per_unit": 4},
    "7896522800067": {"name": "Primer Facial Hidratante", "category": "Skincare", "points_per_unit": 5},
    "7896522800074": {"name": "Serum Vitamina C", "category": "Skincare", "points_per_unit": 7},
    "7896522800081": {"name": "Agua Micelar 200ml", "category": "Skincare", "points_per_unit": 3},
    "7896522800098": {"name": "Kit Pinceis Maquiagem 12pcs", "category": "Acessorios", "points_per_unit": 10},
    "7896522800104": {"name": "Esmalte Gel Ruby Rose", "category": "Unhas", "points_per_unit": 2},
    "7896522800111": {"name": "Lip Gloss Volumizador", "category": "Maquiagem", "points_per_unit": 4},
    "7896522800128": {"name": "Corretivo Liquido HD", "category": "Maquiagem", "points_per_unit": 3},
}


def simulate_nfe_lookup(access_key: str) -> dict:
    clean_key = re.sub(r"\D", "", access_key)
    store_names = ["Perfumaria Bella Vista", "MakeB Store", "Beauty Box", "Rede Farma", "Perfumaria Central"]
    all_products = list(RUBY_ROSE_PRODUCTS_EAN.items())
    selected_rr = random.sample(all_products, min(random.randint(1, 4), len(all_products)))
    items: list[dict] = []
    total_value = 0.0
    total_points = 0
    for ean, product in selected_rr:
        qty = random.randint(1, 3)
        price = round(random.uniform(12.90, 59.90), 2)
        item_total = round(qty * price, 2)
        pts = qty * product["points_per_unit"]
        total_value += item_total
        total_points += pts
        items.append({
            "ean": ean, "name": product["name"], "quantity": qty,
            "unit_price": price, "total": item_total, "is_ruby_rose": True,
            "points_earned": pts, "category": product["category"],
        })
    total_value = round(total_value, 2)
    store = random.choice(store_names)
    city = random.choice(["Sao Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba"])
    return {
        "access_key": clean_key, "store_name": store, "store_cnpj": "12345678000190",
        "city": city, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "items": items, "total_value": total_value, "total_points": total_points,
        "ruby_rose_items_count": len(items),
    }


def _process_nfe(nfe_data: dict, user: Optional[dict] = None) -> dict:
    receipt_id = f"receipt-{uuid.uuid4().hex[:8]}"
    receipt = {
        "id": receipt_id, "access_key": nfe_data["access_key"],
        "store_name": nfe_data["store_name"], "store_cnpj": nfe_data["store_cnpj"],
        "city": nfe_data["city"], "date": nfe_data["date"],
        "total_value": nfe_data["total_value"], "total_points": nfe_data["total_points"],
        "ruby_rose_items": nfe_data["ruby_rose_items_count"], "items": nfe_data["items"],
        "user_id": user["id"] if user else None, "status": "processado",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    receipts_db.append(receipt)
    if user:
        user["points"] = user.get("points", 0) + nfe_data["total_points"]
        user["receipts_count"] = user.get("receipts_count", 0) + 1
    return receipt


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/healthz")
async def healthz():
    return {"status": "ok", "version": app.version}


# ============================================================
# AUTH ENDPOINTS
# ============================================================
@app.post("/api/auth/register")
def register(req: RegisterRequest):
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
    return {"message": "Cadastro realizado! Aguardando aprovacao.", "token": token, "user": safe_user_response(user)}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = users_db.get(req.email)
    if not user or not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_token(user["id"], req.email, user["role"])
    return {"token": token, "user": safe_user_response(user)}


@app.get("/api/auth/me")
def get_me(user: dict = Depends(require_auth)):
    store = stores_db.get(user.get("store_cnpj", ""))
    resp = safe_user_response(user)
    if store:
        resp["store_name"] = store["name"]
        resp["store_address"] = store["address"]
        resp["store_city"] = store["city"]
    return resp


# ============================================================
# DASHBOARD DATA
# ============================================================
@app.get("/api/dashboard")
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
    return {
        "user": safe_user_response(user), "store": store,
        "points": user.get("points", 0), "level": user.get("level", "Bronze"),
        "total_orders": len(user_orders),
        "total_order_value": sum(o["total_value"] for o in user_orders),
        "banners": active_banners, "recent_orders": recent_orders,
        "active_challenges": challenge_progress,
        "pending_challenges": len([c for c in challenge_progress if c["progress"] < c["goal"]]),
    }


# ============================================================
# CATALOG ENDPOINTS
# ============================================================
@app.get("/api/catalog")
def get_catalog(category: Optional[str] = None, search: Optional[str] = None):
    products = CATALOG_PRODUCTS[:]
    if category and category != "Todas":
        products = [p for p in products if p["category"] == category]
    if search:
        search_lower = search.lower()
        products = [p for p in products if search_lower in p["name"].lower() or search_lower in p.get("description", "").lower()]
    return {"total": len(products), "products": products}


@app.get("/api/catalog/categories")
def get_categories():
    cats = sorted(set(p["category"] for p in CATALOG_PRODUCTS))
    return {"categories": ["Todas"] + cats}


@app.get("/api/catalog/{product_id}")
def get_product_detail(product_id: int):
    for p in CATALOG_PRODUCTS:
        if p["id"] == product_id:
            return p
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


# ============================================================
# ORDER ENDPOINTS
# ============================================================
@app.post("/api/orders")
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
            raise HTTPException(status_code=400, detail=f"{product['name']}: quantidade minima e {product['min_order']} unidades")
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
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
    return {"message": f"Pedido #{order_id} criado com sucesso! +{points_earned} pontos", "order": order}


@app.get("/api/orders")
def list_orders(user: dict = Depends(require_auth)):
    if user["role"] == "admin":
        user_orders = orders_db
    elif user["role"] == "vendedor_ruby":
        user_orders = [o for o in orders_db if o.get("vendedor_ruby_id") == user["id"]]
    else:
        user_orders = [o for o in orders_db if o["user_id"] == user["id"]]
    sorted_orders = sorted(user_orders, key=lambda x: x["created_at"], reverse=True)
    return {"total": len(sorted_orders), "orders": sorted_orders}


@app.get("/api/orders/{order_id}")
def get_order(order_id: str, user: dict = Depends(require_auth)):
    for o in orders_db:
        if o["id"] == order_id:
            if user["role"] not in ["admin", "vendedor_ruby"] and o["user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Acesso negado a este pedido")
            return o
    raise HTTPException(status_code=404, detail="Pedido nao encontrado")


@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: str, status: str, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    valid_statuses = ["enviado", "aprovado", "em_separacao", "em_transito", "entregue", "cancelado"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalido. Use: {', '.join(valid_statuses)}")
    for o in orders_db:
        if o["id"] == order_id:
            o["status"] = status
            o["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {"message": f"Status atualizado para {status}", "order": o}
    raise HTTPException(status_code=404, detail="Pedido nao encontrado")


# ============================================================
# CHALLENGE ENDPOINTS
# ============================================================
@app.get("/api/challenges")
def list_challenges(user: dict = Depends(require_auth)):
    active = [c for c in challenges_db if c["active"]]
    user_subs = [s for s in challenge_submissions_db if s["user_id"] == user["id"]]
    result = []
    for c in active:
        subs = [s for s in user_subs if s["challenge_id"] == c["id"]]
        kit = None
        if c.get("reward_kit_id"):
            for k in reward_kits_db:
                if k["id"] == c["reward_kit_id"]:
                    kit = k
                    break
        result.append({
            **c, "progress": len(subs),
            "completed": len(subs) >= c["goal"], "reward_kit": kit,
        })
    return {"total": len(result), "challenges": result}


@app.post("/api/challenges/submit")
def submit_challenge(req: ChallengeSubmissionRequest, user: dict = Depends(require_auth)):
    challenge = None
    for c in challenges_db:
        if c["id"] == req.challenge_id:
            challenge = c
            break
    if not challenge:
        raise HTTPException(status_code=404, detail="Desafio nao encontrado")
    if not challenge["active"]:
        raise HTTPException(status_code=400, detail="Este desafio nao esta mais ativo")
    user_subs = [s for s in challenge_submissions_db if s["user_id"] == user["id"] and s["challenge_id"] == req.challenge_id]
    if len(user_subs) >= challenge["goal"]:
        raise HTTPException(status_code=400, detail="Voce ja completou este desafio!")
    sub_id = f"sub-{uuid.uuid4().hex[:8]}"
    submission = {
        "id": sub_id, "user_id": user["id"], "challenge_id": req.challenge_id,
        "photo_url": req.photo_url or f"https://storage.rubyrose.com/vitrines/{sub_id}.jpg",
        "notes": req.notes, "status": "pendente",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    challenge_submissions_db.append(submission)
    new_count = len(user_subs) + 1
    completed = new_count >= challenge["goal"]
    if completed:
        user["points"] = user.get("points", 0) + challenge["points_reward"]
        user["challenges_completed"] = user.get("challenges_completed", 0) + 1
    return {
        "message": "Envio registrado com sucesso!" + (" Desafio concluido! Parabens!" if completed else f" {new_count}/{challenge['goal']}"),
        "submission": submission, "progress": new_count, "goal": challenge["goal"],
        "completed": completed, "points_earned": challenge["points_reward"] if completed else 0,
    }


@app.post("/api/admin/challenges")
def create_challenge(req: ChallengeCreateRequest, user: dict = Depends(require_admin)):
    challenge_id = f"challenge-{uuid.uuid4().hex[:8]}"
    challenge = {
        "id": challenge_id, "title": req.title, "description": req.description,
        "type": req.type, "reward_kit_id": req.reward_kit_id,
        "points_reward": req.points_reward, "goal": req.goal, "active": True,
        "start_date": req.start_date, "end_date": req.end_date, "created_by": user["id"],
    }
    challenges_db.append(challenge)
    return {"message": "Desafio criado com sucesso", "challenge": challenge}


# ============================================================
# REWARDS / KIT ENDPOINTS
# ============================================================
@app.get("/api/rewards/kits")
def list_reward_kits():
    return {"total": len(reward_kits_db), "kits": [k for k in reward_kits_db if k.get("available", True)]}


@app.post("/api/rewards/redeem")
def redeem_kit(req: RedeemKitRequest, user: dict = Depends(require_auth)):
    kit = None
    for k in reward_kits_db:
        if k["id"] == req.kit_id:
            kit = k
            break
    if not kit:
        raise HTTPException(status_code=404, detail="Kit nao encontrado")
    if user.get("points", 0) < kit["points_cost"]:
        raise HTTPException(status_code=400, detail=f"Pontos insuficientes. Voce tem {user['points']} pts, precisa de {kit['points_cost']} pts")
    user["points"] -= kit["points_cost"]
    redemption_id = f"redeem-{uuid.uuid4().hex[:8]}"
    redemption = {
        "id": redemption_id, "user_id": user["id"], "kit_id": kit["id"],
        "kit_name": kit["name"], "points_spent": kit["points_cost"],
        "shipping_address": req.shipping_address or "Endereco da loja vinculada",
        "status": "processando", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    redemptions_db.append(redemption)
    return {
        "message": f"Kit '{kit['name']}' resgatado com sucesso! Sera enviado em ate 10 dias uteis.",
        "redemption": redemption, "remaining_points": user["points"],
    }


@app.get("/api/rewards/history")
def get_redemption_history(user: dict = Depends(require_auth)):
    user_redemptions = [r for r in redemptions_db if r["user_id"] == user["id"]]
    return {"total": len(user_redemptions), "redemptions": sorted(user_redemptions, key=lambda x: x["created_at"], reverse=True)}


# ============================================================
# RECEIPT / CUPOM ENDPOINTS (sell-out tracking)
# ============================================================
@app.post("/api/receipts/lookup")
def lookup_cupom(req: CupomLookupRequest):
    clean_key = re.sub(r"\D", "", req.access_key)
    if len(clean_key) < 44:
        raise HTTPException(status_code=400, detail="Chave de acesso deve ter 44 digitos")
    nfe = simulate_nfe_lookup(clean_key)
    return nfe


@app.post("/api/receipts/scan")
def scan_qrcode(req: QRCodeScanRequest, user: Optional[dict] = Depends(get_current_user)):
    clean_data = re.sub(r"\D", "", req.qr_data)
    if len(clean_data) < 44:
        raise HTTPException(status_code=400, detail="QR Code invalido")
    nfe = simulate_nfe_lookup(clean_data)
    receipt = _process_nfe(nfe, user)
    return {"message": f"Cupom processado! +{nfe['total_points']} pontos", "receipt": receipt}


@app.get("/api/receipts")
def get_receipts(user: dict = Depends(require_auth)):
    user_receipts = [r for r in receipts_db if r.get("user_id") == user["id"]]
    return {
        "total": len(user_receipts),
        "total_points": sum(r.get("total_points", 0) for r in user_receipts),
        "receipts": sorted(user_receipts, key=lambda x: x["created_at"], reverse=True),
    }


# ============================================================
# STORE ENDPOINTS
# ============================================================
@app.get("/api/stores")
def list_stores(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    if user["role"] == "vendedor_ruby":
        stores = [s for s in stores_db.values() if s.get("vendedor_ruby_id") == user["id"]]
    else:
        stores = list(stores_db.values())
    return {"total": len(stores), "stores": stores}


@app.get("/api/stores/{cnpj}")
def get_store(cnpj: str, user: dict = Depends(require_auth)):
    store = stores_db.get(cnpj)
    if not store:
        raise HTTPException(status_code=404, detail="Loja nao encontrada")
    promotoras = [safe_user_response(u) for u in users_db.values() if u.get("store_cnpj") == cnpj and u["role"] == "promotora"]
    store_orders = [o for o in orders_db if o.get("store_cnpj") == cnpj]
    return {
        **store, "promotoras_count": len(promotoras),
        "orders_count": len(store_orders),
        "total_order_value": sum(o["total_value"] for o in store_orders),
    }


# ============================================================
# BANNER MANAGEMENT (admin only)
# ============================================================
@app.get("/api/banners")
def get_active_banners():
    active = sorted([b for b in banners_db if b["active"]], key=lambda x: x.get("position", 999))
    return {"total": len(active), "banners": active}


@app.get("/api/admin/banners")
def list_all_banners(user: dict = Depends(require_admin)):
    return {"total": len(banners_db), "banners": sorted(banners_db, key=lambda x: x.get("position", 999))}


@app.post("/api/admin/banners")
def create_banner(req: BannerCreateRequest, user: dict = Depends(require_admin)):
    banner_id = f"banner-{uuid.uuid4().hex[:8]}"
    banner = {
        "id": banner_id, "title": req.title, "subtitle": req.subtitle,
        "description": req.description, "image_url": req.image_url, "color": req.color,
        "highlight": req.highlight, "position": req.position, "active": req.active,
        "start_date": req.start_date, "end_date": req.end_date, "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    banners_db.append(banner)
    return {"message": "Banner criado com sucesso", "banner": banner}


@app.put("/api/admin/banners/{banner_id}")
def update_banner(banner_id: str, req: BannerUpdateRequest, user: dict = Depends(require_admin)):
    for b in banners_db:
        if b["id"] == banner_id:
            for field, value in req.model_dump(exclude_none=True).items():
                b[field] = value
            b["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {"message": "Banner atualizado", "banner": b}
    raise HTTPException(status_code=404, detail="Banner nao encontrado")


@app.delete("/api/admin/banners/{banner_id}")
def delete_banner(banner_id: str, user: dict = Depends(require_admin)):
    for i, b in enumerate(banners_db):
        if b["id"] == banner_id:
            banners_db.pop(i)
            return {"message": "Banner removido"}
    raise HTTPException(status_code=404, detail="Banner nao encontrado")


# ============================================================
# ADMIN USER MANAGEMENT
# ============================================================
@app.get("/api/admin/users")
def list_users(user: dict = Depends(require_admin)):
    return {"total": len(users_db), "users": [safe_user_response(u) for u in users_db.values()]}


@app.patch("/api/admin/users/{user_id}/approve")
def approve_user(user_id: str, admin_user: dict = Depends(require_admin)):
    for u in users_db.values():
        if u["id"] == user_id:
            u["status"] = "active"
            return {"message": "Usuario aprovado com sucesso", "user": safe_user_response(u)}
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


@app.patch("/api/admin/users/{user_id}/role")
def update_user_role(user_id: str, role: str, admin_user: dict = Depends(require_admin)):
    valid_roles = ["promotora", "gerente_loja", "vendedor_ruby", "admin"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Perfil invalido. Use: {', '.join(valid_roles)}")
    for u in users_db.values():
        if u["id"] == user_id:
            u["role"] = role
            return {"message": f"Perfil atualizado para {role}", "user": safe_user_response(u)}
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


# ============================================================
# INTEGRATION ENDPOINTS (external systems)
# ============================================================
@app.get("/api/integrations/stock")
def get_stock(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return {"total": len(integrations_stock_db), "stock": integrations_stock_db}


@app.post("/api/integrations/stock")
def update_stock(req: StockUpdateRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    entry = {
        "id": f"stock-{uuid.uuid4().hex[:8]}", "product_ean": req.product_ean,
        "quantity": req.quantity, "warehouse": req.warehouse,
        "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_stock_db.append(entry)
    return {"message": "Estoque atualizado", "entry": entry}


@app.get("/api/integrations/catalog")
def get_ext_catalog(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return {"total": len(integrations_catalog_db), "catalog": integrations_catalog_db}


@app.post("/api/integrations/catalog")
def add_catalog_item(req: CatalogItemRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    item = {
        "id": f"cat-{uuid.uuid4().hex[:8]}", **req.model_dump(),
        "created_by": user["id"], "created_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_catalog_db.append(item)
    return {"message": "Item adicionado ao catalogo", "item": item}


@app.get("/api/integrations/prices")
def get_prices(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return {"total": len(integrations_prices_db), "prices": integrations_prices_db}


@app.post("/api/integrations/prices")
def update_price(req: PriceUpdateRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    entry = {
        "id": f"price-{uuid.uuid4().hex[:8]}", "product_id": req.product_id,
        "new_price": req.new_price, "effective_date": req.effective_date,
        "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_prices_db.append(entry)
    return {"message": "Preco atualizado", "entry": entry}


@app.get("/api/integrations/promotions")
def get_promotions(user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    return {"total": len(integrations_promotions_db), "promotions": integrations_promotions_db}


@app.post("/api/integrations/promotions")
def create_promotion(req: PromotionRequest, user: dict = Depends(require_role(["admin", "vendedor_ruby"]))):
    promo = {
        "id": f"promo-{uuid.uuid4().hex[:8]}", **req.model_dump(),
        "created_by": user["id"], "created_at": datetime.now(timezone.utc).isoformat(),
    }
    integrations_promotions_db.append(promo)
    return {"message": "Promocao criada", "promotion": promo}


@app.get("/api/integrations/webhooks")
def list_webhooks(user: dict = Depends(require_admin)):
    return {"total": len(webhooks_db), "webhooks": webhooks_db}


@app.post("/api/integrations/webhooks")
def register_webhook(req: WebhookRegisterRequest, user: dict = Depends(require_admin)):
    wh = {
        "id": f"wh-{uuid.uuid4().hex[:8]}", "url": req.url, "events": req.events,
        "secret": req.secret, "description": req.description,
        "created_by": user["id"], "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }
    webhooks_db.append(wh)
    return {"message": "Webhook registrado", "webhook": wh}


# ============================================================
# LGPD COMPLIANCE
# ============================================================
@app.get("/api/lgpd/privacy-policy")
def get_privacy_policy():
    return {
        "title": "Politica de Privacidade - Ruby Rose B2B",
        "version": "2.0",
        "sections": [
            {"title": "1. Coleta de Dados", "content": "Coletamos dados necessarios para o funcionamento da plataforma B2B: nome, email, CPF, telefone, CNPJ da loja e dados de pedidos. Esses dados sao essenciais para vincular voce a sua loja parceira e processar pedidos."},
            {"title": "2. Uso dos Dados", "content": "Utilizamos seus dados para: processar pedidos de produtos para sua loja, calcular pontos e recompensas, personalizar desafios e campanhas, e melhorar a comunicacao entre Ruby Rose e as lojas parceiras."},
            {"title": "3. Compartilhamento", "content": "Seus dados podem ser compartilhados com o representante comercial Ruby Rose responsavel pela sua regiao e com a gerencia da loja onde voce atua, para fins de acompanhamento de vendas e comissionamento."},
            {"title": "4. Seguranca", "content": "Seus dados sao protegidos com criptografia e controle de acesso por perfil. Apenas usuarios autorizados podem visualizar informacoes sensiveis."},
            {"title": "5. Direitos LGPD", "content": "Voce tem o direito de acessar, corrigir, exportar e solicitar a exclusao dos seus dados pessoais a qualquer momento atraves do aplicativo."},
            {"title": "6. Consentimento", "content": "Ao se cadastrar, voce consente com a coleta e uso dos dados descritos nesta politica. Voce pode revogar o consentimento a qualquer momento."},
            {"title": "7. Contato", "content": "Para duvidas sobre privacidade, entre em contato: privacy@rubyrose.com.br ou atraves do canal de suporte no aplicativo."},
        ],
        "last_updated": "2026-03-01",
    }


@app.post("/api/lgpd/consent")
def submit_consent(req: LGPDConsentRequest, user: dict = Depends(require_auth)):
    lgpd_consents_db[user["email"]] = {
        "user_id": user["id"], "email": user["email"],
        "consent_data_collection": req.consent_data_collection,
        "consent_marketing": req.consent_marketing,
        "consent_third_party": req.consent_third_party,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    user["lgpd_consent"] = True
    user["lgpd_consent_date"] = datetime.now(timezone.utc).isoformat()
    return {"message": "Consentimento registrado com sucesso"}


@app.get("/api/lgpd/consent")
def get_consent(user: dict = Depends(require_auth)):
    return lgpd_consents_db.get(user["email"], {"message": "Nenhum consentimento registrado"})


@app.get("/api/lgpd/export")
def export_user_data(user: dict = Depends(require_auth)):
    user_orders = [o for o in orders_db if o["user_id"] == user["id"]]
    user_receipts = [r for r in receipts_db if r.get("user_id") == user["id"]]
    user_subs = [s for s in challenge_submissions_db if s["user_id"] == user["id"]]
    user_redemptions = [r for r in redemptions_db if r["user_id"] == user["id"]]
    return {
        "personal_data": safe_user_response(user),
        "store": stores_db.get(user.get("store_cnpj", "")),
        "orders": user_orders, "receipts": user_receipts,
        "challenge_submissions": user_subs, "redemptions": user_redemptions,
        "consent": lgpd_consents_db.get(user["email"]),
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


@app.delete("/api/lgpd/data")
def delete_user_data(user: dict = Depends(require_auth)):
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Nao e possivel excluir conta de administrador")
    email = user["email"]
    if email in users_db:
        del users_db[email]
    lgpd_consents_db.pop(email, None)
    global orders_db, receipts_db, challenge_submissions_db, redemptions_db
    orders_db = [o for o in orders_db if o["user_id"] != user["id"]]
    receipts_db = [r for r in receipts_db if r.get("user_id") != user["id"]]
    challenge_submissions_db = [s for s in challenge_submissions_db if s["user_id"] != user["id"]]
    redemptions_db = [r for r in redemptions_db if r["user_id"] != user["id"]]
    return {"message": "Seus dados foram removidos conforme a LGPD. Esta acao e irreversivel."}


# ============================================================
# COMPANY SETTINGS (admin only)
# ============================================================
company_settings_db: dict = {
    "name": "Ruby Rose Cosmeticos",
    "logo_url": None,
    "primary_color": "#BE185D",
    "secondary_color": "#EC4899",
    "contact_email": "contato@rubyrose.com.br",
    "contact_phone": "(11) 3000-1234",
    "website": "https://www.rubyrose.com.br",
    "cnpj": "00.000.000/0001-00",
    "address": "Rua da Beleza, 500 - Sao Paulo, SP",
    "about": "Ruby Rose Cosmeticos - Lider em maquiagem e cuidados pessoais no Brasil.",
    "updated_at": datetime.now(timezone.utc).isoformat(),
}

activity_logs_db: list[dict] = []


def log_activity(user_id: str, user_name: str, action: str, details: str = ""):
    activity_logs_db.append({
        "id": f"log-{uuid.uuid4().hex[:8]}",
        "user_id": user_id, "user_name": user_name,
        "action": action, "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    if len(activity_logs_db) > 500:
        activity_logs_db.pop(0)


@app.get("/api/admin/company")
def get_company_settings(user: dict = Depends(require_admin)):
    return company_settings_db


class CompanySettingsUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    cnpj: Optional[str] = None
    address: Optional[str] = None
    about: Optional[str] = None


@app.put("/api/admin/company")
def update_company_settings(req: CompanySettingsUpdate, user: dict = Depends(require_admin)):
    for field, value in req.model_dump(exclude_none=True).items():
        company_settings_db[field] = value
    company_settings_db["updated_at"] = datetime.now(timezone.utc).isoformat()
    log_activity(user["id"], user["name"], "company_update", "Configuracoes da empresa atualizadas")
    return {"message": "Configuracoes atualizadas com sucesso", "settings": company_settings_db}


# ============================================================
# ADMIN: PRODUCT MANAGEMENT (CRUD)
# ============================================================
class AdminProductRequest(BaseModel):
    name: str
    ean: Optional[str] = None
    price: float
    category: str
    description: Optional[str] = None
    min_order: int = 1
    image: Optional[str] = None
    stock_available: bool = True


@app.get("/api/admin/products")
def admin_list_products(user: dict = Depends(require_admin)):
    return {"total": len(CATALOG_PRODUCTS), "products": CATALOG_PRODUCTS}


@app.post("/api/admin/products")
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
    return {"message": "Produto criado com sucesso", "product": product}


class AdminProductUpdate(BaseModel):
    name: Optional[str] = None
    ean: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    min_order: Optional[int] = None
    image: Optional[str] = None
    stock_available: Optional[bool] = None


@app.put("/api/admin/products/{product_id}")
def admin_update_product(product_id: int, req: AdminProductUpdate, user: dict = Depends(require_admin)):
    for p in CATALOG_PRODUCTS:
        if p["id"] == product_id:
            for field, value in req.model_dump(exclude_none=True).items():
                p[field] = value
            log_activity(user["id"], user["name"], "product_update", f"Produto atualizado: {p['name']}")
            return {"message": "Produto atualizado", "product": p}
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


@app.delete("/api/admin/products/{product_id}")
def admin_delete_product(product_id: int, user: dict = Depends(require_admin)):
    for i, p in enumerate(CATALOG_PRODUCTS):
        if p["id"] == product_id:
            removed = CATALOG_PRODUCTS.pop(i)
            log_activity(user["id"], user["name"], "product_delete", f"Produto removido: {removed['name']}")
            return {"message": "Produto removido"}
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


@app.patch("/api/admin/products/{product_id}/toggle")
def admin_toggle_product(product_id: int, user: dict = Depends(require_admin)):
    for p in CATALOG_PRODUCTS:
        if p["id"] == product_id:
            p["stock_available"] = not p.get("stock_available", True)
            st = "ativado" if p["stock_available"] else "desativado"
            log_activity(user["id"], user["name"], "product_toggle", f"Produto {st}: {p['name']}")
            return {"message": f"Produto {st}", "product": p}
    raise HTTPException(status_code=404, detail="Produto nao encontrado")


# ============================================================
# ADMIN: USER MANAGEMENT (extended)
# ============================================================
class AdminCreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "promotora"
    cpf: Optional[str] = None
    phone: Optional[str] = None
    store_cnpj: Optional[str] = None
    status: str = "active"


@app.post("/api/admin/users")
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
    return {"message": "Usuario criado com sucesso", "user": safe_user_response(new_user)}


class AdminEditUserRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    store_cnpj: Optional[str] = None


@app.put("/api/admin/users/{user_id}")
def admin_edit_user(user_id: str, req: AdminEditUserRequest, admin_user: dict = Depends(require_admin)):
    for u in users_db.values():
        if u["id"] == user_id:
            for field, value in req.model_dump(exclude_none=True).items():
                u[field] = value
            log_activity(admin_user["id"], admin_user["name"], "user_edit", f"Usuario editado: {u['name']}")
            return {"message": "Usuario atualizado", "user": safe_user_response(u)}
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


@app.patch("/api/admin/users/{user_id}/toggle")
def admin_toggle_user(user_id: str, admin_user: dict = Depends(require_admin)):
    for u in users_db.values():
        if u["id"] == user_id:
            u["status"] = "inactive" if u.get("status") == "active" else "active"
            st = u["status"]
            log_activity(admin_user["id"], admin_user["name"], "user_toggle", f"Usuario {st}: {u['name']}")
            return {"message": f"Usuario {st}", "user": safe_user_response(u)}
    raise HTTPException(status_code=404, detail="Usuario nao encontrado")


# ============================================================
# ADMIN: STORE MANAGEMENT
# ============================================================
class AdminStoreRequest(BaseModel):
    cnpj: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    vendedor_ruby_id: Optional[str] = None


@app.post("/api/admin/stores")
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
    return {"message": "Loja criada com sucesso", "store": store}


# ============================================================
# ADMIN: ORDERS MANAGEMENT
# ============================================================
@app.get("/api/admin/orders")
def admin_list_orders(status: Optional[str] = None, user: dict = Depends(require_admin)):
    result = orders_db[:]
    if status:
        result = [o for o in result if o["status"] == status]
    sorted_orders = sorted(result, key=lambda x: x["created_at"], reverse=True)
    stats = {
        "total": len(orders_db),
        "by_status": {},
        "total_value": sum(o["total_value"] for o in orders_db),
    }
    for o in orders_db:
        s = o["status"]
        stats["by_status"][s] = stats["by_status"].get(s, 0) + 1
    return {"orders": sorted_orders, "stats": stats}


# ============================================================
# ADMIN: ACTIVITY LOGS
# ============================================================
@app.get("/api/admin/logs")
def get_activity_logs(limit: int = 50, user: dict = Depends(require_admin)):
    logs = sorted(activity_logs_db, key=lambda x: x["timestamp"], reverse=True)[:limit]
    return {"total": len(activity_logs_db), "logs": logs}


# ============================================================
# ADMIN: DASHBOARD STATS
# ============================================================
@app.get("/api/admin/stats")
def get_admin_stats(user: dict = Depends(require_admin)):
    total_users = len(users_db)
    total_stores = len(stores_db)
    total_orders = len(orders_db)
    total_revenue = sum(o["total_value"] for o in orders_db)
    total_products = len(CATALOG_PRODUCTS)
    active_chall = len([c for c in challenges_db if c["active"]])
    total_subs = len(challenge_submissions_db)
    total_reds = len(redemptions_db)
    users_by_role = {}
    for u in users_db.values():
        r = u.get("role", "unknown")
        users_by_role[r] = users_by_role.get(r, 0) + 1
    orders_by_status = {}
    for o in orders_db:
        s = o["status"]
        orders_by_status[s] = orders_by_status.get(s, 0) + 1
    return {
        "total_users": total_users, "total_stores": total_stores,
        "total_orders": total_orders, "total_revenue": round(total_revenue, 2),
        "total_products": total_products, "active_challenges": active_chall,
        "total_submissions": total_subs, "total_redemptions": total_reds,
        "users_by_role": users_by_role, "orders_by_status": orders_by_status,
        "active_banners": len([b for b in banners_db if b["active"]]),
        "total_banners": len(banners_db),
        "total_stock_entries": len(admin_stock_db),
        "low_stock_count": len([s for s in admin_stock_db if s["quantity"] <= s.get("low_stock_alert", 10)]),
        "total_images": len(admin_images_db),
        "total_integrations": len(admin_integrations_db),
        "active_integrations": len([ig for ig in admin_integrations_db if ig["active"]]),
    }


# ============================================================
# ADMIN: STOCK MANAGEMENT
# ============================================================
admin_stock_db: list[dict] = [
    {"id": "stock-001", "product_id": 1, "product_name": "Base Liquida HD", "ean": "7896522800012", "quantity": 150, "low_stock_alert": 20, "warehouse": "SP Principal", "last_updated": datetime.now(timezone.utc).isoformat()},
    {"id": "stock-002", "product_id": 2, "product_name": "Paleta de Sombras 18 Cores", "ean": "7896522800029", "quantity": 8, "low_stock_alert": 15, "warehouse": "SP Principal", "last_updated": datetime.now(timezone.utc).isoformat()},
    {"id": "stock-003", "product_id": 3, "product_name": "Batom Matte Longa Duracao", "ean": "7896522800036", "quantity": 200, "low_stock_alert": 30, "warehouse": "SP Principal", "last_updated": datetime.now(timezone.utc).isoformat()},
    {"id": "stock-004", "product_id": 4, "product_name": "Mascara de Cilios Volume", "ean": "7896522800043", "quantity": 5, "low_stock_alert": 10, "warehouse": "RJ Filial", "last_updated": datetime.now(timezone.utc).isoformat()},
    {"id": "stock-005", "product_id": 5, "product_name": "Po Compacto HD", "ean": "7896522800050", "quantity": 75, "low_stock_alert": 15, "warehouse": "SP Principal", "last_updated": datetime.now(timezone.utc).isoformat()},
]


class AdminStockUpdateRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    ean: Optional[str] = None
    quantity: int
    low_stock_alert: int = 10
    warehouse: str = "SP Principal"


@app.get("/api/admin/stock")
def admin_list_stock(user: dict = Depends(require_admin)):
    low_stock = [s for s in admin_stock_db if s["quantity"] <= s.get("low_stock_alert", 10)]
    return {"total": len(admin_stock_db), "low_stock_count": len(low_stock), "stock": admin_stock_db}


@app.post("/api/admin/stock")
def admin_create_stock(req: AdminStockUpdateRequest, user: dict = Depends(require_admin)):
    entry = {
        "id": f"stock-{uuid.uuid4().hex[:8]}", "product_id": req.product_id,
        "product_name": req.product_name or "", "ean": req.ean or "",
        "quantity": req.quantity, "low_stock_alert": req.low_stock_alert,
        "warehouse": req.warehouse, "last_updated": datetime.now(timezone.utc).isoformat(),
    }
    admin_stock_db.append(entry)
    log_activity(user["id"], user["name"], "stock_create", f"Estoque criado: {req.product_name}")
    return {"message": "Registro de estoque criado", "entry": entry}


@app.put("/api/admin/stock/{stock_id}")
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
            return {"message": "Estoque atualizado", "entry": s}
    raise HTTPException(status_code=404, detail="Registro de estoque nao encontrado")


@app.delete("/api/admin/stock/{stock_id}")
def admin_delete_stock(stock_id: str, user: dict = Depends(require_admin)):
    for i, s in enumerate(admin_stock_db):
        if s["id"] == stock_id:
            removed = admin_stock_db.pop(i)
            log_activity(user["id"], user["name"], "stock_delete", f"Estoque removido: {removed['product_name']}")
            return {"message": "Registro removido"}
    raise HTTPException(status_code=404, detail="Registro de estoque nao encontrado")


# ============================================================
# ADMIN: IMAGE MANAGEMENT
# ============================================================
admin_images_db: list[dict] = [
    {"id": "img-001", "name": "Base Liquida HD - Frente", "url": "https://via.placeholder.com/300x300/BE185D/fff?text=Base+HD", "product_id": 1, "product_name": "Base Liquida HD", "type": "produto", "created_at": datetime.now(timezone.utc).isoformat()},
    {"id": "img-002", "name": "Paleta Sombras - Aberta", "url": "https://via.placeholder.com/300x300/EC4899/fff?text=Paleta+18", "product_id": 2, "product_name": "Paleta de Sombras 18 Cores", "type": "produto", "created_at": datetime.now(timezone.utc).isoformat()},
    {"id": "img-003", "name": "Banner Home Verao", "url": "https://via.placeholder.com/800x300/BE185D/fff?text=Verao+RR", "product_id": None, "product_name": None, "type": "banner", "created_at": datetime.now(timezone.utc).isoformat()},
]


class AdminImageRequest(BaseModel):
    name: str
    url: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    type: str = "produto"


@app.get("/api/admin/images")
def admin_list_images(user: dict = Depends(require_admin)):
    return {"total": len(admin_images_db), "images": admin_images_db}


@app.post("/api/admin/images")
def admin_create_image(req: AdminImageRequest, user: dict = Depends(require_admin)):
    img = {
        "id": f"img-{uuid.uuid4().hex[:8]}", "name": req.name, "url": req.url,
        "product_id": req.product_id, "product_name": req.product_name,
        "type": req.type, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    admin_images_db.append(img)
    log_activity(user["id"], user["name"], "image_create", f"Imagem adicionada: {req.name}")
    return {"message": "Imagem adicionada com sucesso", "image": img}


@app.put("/api/admin/images/{image_id}")
def admin_update_image(image_id: str, req: AdminImageRequest, user: dict = Depends(require_admin)):
    for img in admin_images_db:
        if img["id"] == image_id:
            img["name"] = req.name
            img["url"] = req.url
            img["product_id"] = req.product_id
            img["product_name"] = req.product_name
            img["type"] = req.type
            log_activity(user["id"], user["name"], "image_update", f"Imagem atualizada: {req.name}")
            return {"message": "Imagem atualizada", "image": img}
    raise HTTPException(status_code=404, detail="Imagem nao encontrada")


@app.delete("/api/admin/images/{image_id}")
def admin_delete_image(image_id: str, user: dict = Depends(require_admin)):
    for i, img in enumerate(admin_images_db):
        if img["id"] == image_id:
            removed = admin_images_db.pop(i)
            log_activity(user["id"], user["name"], "image_delete", f"Imagem removida: {removed['name']}")
            return {"message": "Imagem removida"}
    raise HTTPException(status_code=404, detail="Imagem nao encontrada")


# ============================================================
# ADMIN: INTEGRATIONS / API MANAGEMENT
# ============================================================
admin_integrations_db: list[dict] = [
    {"id": "int-001", "name": "ERP Totvs", "type": "erp", "api_url": "https://api.totvs.com/v1", "api_key": "sk-***...***abc", "description": "Integracao com ERP Totvs para estoque e pedidos", "active": True, "status": "connected", "last_sync": datetime.now(timezone.utc).isoformat()},
    {"id": "int-002", "name": "Correios API", "type": "logistica", "api_url": "https://api.correios.com.br/v2", "api_key": "cr-***...***xyz", "description": "Rastreamento de entregas via Correios", "active": True, "status": "connected", "last_sync": datetime.now(timezone.utc).isoformat()},
    {"id": "int-003", "name": "Bling ERP", "type": "erp", "api_url": "https://api.bling.com.br/v3", "api_key": "", "description": "Integracao alternativa com Bling (nao configurada)", "active": False, "status": "disconnected", "last_sync": None},
]


class AdminIntegrationRequest(BaseModel):
    name: str
    type: str = "erp"
    api_url: str = ""
    api_key: str = ""
    description: str = ""
    active: bool = True


@app.get("/api/admin/integrations")
def admin_list_integrations(user: dict = Depends(require_admin)):
    safe_list = []
    for ig in admin_integrations_db:
        safe = {**ig}
        if safe.get("api_key"):
            key = safe["api_key"]
            safe["api_key_masked"] = key[:3] + "***" + key[-3:] if len(key) > 6 else "***"
        else:
            safe["api_key_masked"] = ""
        safe_list.append(safe)
    return {"total": len(admin_integrations_db), "active": len([i for i in admin_integrations_db if i["active"]]), "integrations": safe_list}


@app.post("/api/admin/integrations")
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
    return {"message": "Integracao criada com sucesso", "integration": ig}


@app.put("/api/admin/integrations/{integration_id}")
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
            return {"message": "Integracao atualizada", "integration": ig}
    raise HTTPException(status_code=404, detail="Integracao nao encontrada")


@app.patch("/api/admin/integrations/{integration_id}/toggle")
def admin_toggle_integration(integration_id: str, user: dict = Depends(require_admin)):
    for ig in admin_integrations_db:
        if ig["id"] == integration_id:
            ig["active"] = not ig["active"]
            ig["status"] = "connected" if ig["active"] else "disconnected"
            if ig["active"]:
                ig["last_sync"] = datetime.now(timezone.utc).isoformat()
            st = "ativada" if ig["active"] else "desativada"
            log_activity(user["id"], user["name"], "integration_toggle", f"Integracao {st}: {ig['name']}")
            return {"message": f"Integracao {st}", "integration": ig}
    raise HTTPException(status_code=404, detail="Integracao nao encontrada")


@app.delete("/api/admin/integrations/{integration_id}")
def admin_delete_integration(integration_id: str, user: dict = Depends(require_admin)):
    for i, ig in enumerate(admin_integrations_db):
        if ig["id"] == integration_id:
            removed = admin_integrations_db.pop(i)
            log_activity(user["id"], user["name"], "integration_delete", f"Integracao removida: {removed['name']}")
            return {"message": "Integracao removida"}
    raise HTTPException(status_code=404, detail="Integracao nao encontrada")


# ============================================================
# ADMIN: BANNER TOGGLE (missing endpoint)
# ============================================================
@app.patch("/api/admin/banners/{banner_id}/toggle")
def admin_toggle_banner(banner_id: str, user: dict = Depends(require_admin)):
    for b in banners_db:
        if b["id"] == banner_id:
            b["active"] = not b["active"]
            st = "ativado" if b["active"] else "desativado"
            log_activity(user["id"], user["name"], "banner_toggle", f"Banner {st}: {b['title']}")
            return {"message": f"Banner {st}", "banner": b}
    raise HTTPException(status_code=404, detail="Banner nao encontrado")
