from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import random
import re

app = FastAPI(title="RubyRose Cashback API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

receipts_db: list[dict] = []
user_data = {
    "id": "user-001",
    "name": "Maria Silva",
    "email": "maria@email.com",
    "cpf": "***.***.***-45",
    "points": 2850,
    "cashback_balance": 47.90,
    "total_cashback_earned": 234.50,
    "receipts_count": 18,
    "level": "Ouro",
}

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


def simulate_nfe_lookup(access_key: str) -> dict:
    clean_key = re.sub(r"\D", "", access_key)
    store_names = ["Farmacia Sao Paulo", "Drogasil", "Drogaria Raia", "Pague Menos", "Panvel", "Extra Hipermercado", "Carrefour", "Magazine Luiza"]
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
        "emission_date": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "store": {"name": store, "cnpj": f"{random.randint(10,99)}.{random.randint(100,999)}.{random.randint(100,999)}/0001-{random.randint(10,99)}", "city": city, "state": state},
        "items": items,
        "total_items": len(items),
        "total_value": total_value,
        "ruby_rose_items": len([i for i in items if i.get("is_ruby_rose")]),
        "cashback_total": cashback_total,
        "points_earned": int(cashback_total * 10),
        "payment_method": random.choice(["Cartao Credito", "Cartao Debito", "PIX", "Dinheiro"]),
    }


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/user")
async def get_user():
    return user_data


@app.get("/api/products")
async def get_products(category: Optional[str] = None):
    products = [
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
    return {"banners": [
        {"id": 1, "title": "100% cashback", "subtitle": "Na primeira compra Ruby Rose", "description": "Valido ate R$30,00", "color": "purple", "highlight": True},
        {"id": 2, "title": "Skincare Week", "subtitle": "Ate 30% de cashback", "description": "Valido esta semana", "color": "pink", "highlight": False},
        {"id": 3, "title": "Dia da Mulher", "subtitle": "Cashback em dobro", "description": "08 de Marco", "color": "rose", "highlight": False},
    ]}


@app.get("/api/services")
async def get_services():
    return [
        {"id": 1, "name": "Jogue e Ganhe", "icon": "gamepad", "badge": "EM DOBRO", "badge_color": "green"},
        {"id": 2, "name": "Ruby Prime", "icon": "diamond", "badge": None, "badge_color": None},
        {"id": 3, "name": "Sorteios", "icon": "gift", "badge": "NOVIDADE", "badge_color": "pink"},
        {"id": 4, "name": "Indicar Amigos", "icon": "users", "badge": None, "badge_color": None},
    ]


class CupomLookupRequest(BaseModel):
    access_key: str


class QRCodeScanRequest(BaseModel):
    qr_data: str


def _process_nfe(nfe_data: dict, source: str = "manual") -> dict:
    receipt_id = str(uuid.uuid4())[:8]
    receipt = {
        "id": receipt_id,
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
        "submitted_at": datetime.now().isoformat(),
        "emission_date": nfe_data["emission_date"],
    }
    receipts_db.append(receipt)
    if nfe_data["ruby_rose_items"] > 0:
        user_data["points"] += nfe_data["points_earned"]
        user_data["cashback_balance"] = round(user_data["cashback_balance"] + nfe_data["cashback_total"], 2)
        user_data["total_cashback_earned"] = round(user_data["total_cashback_earned"] + nfe_data["cashback_total"], 2)
    user_data["receipts_count"] += 1
    return receipt


@app.post("/api/cupom/lookup")
async def lookup_cupom(request: CupomLookupRequest):
    nfe_data = simulate_nfe_lookup(request.access_key)
    receipt = _process_nfe(nfe_data, "manual")
    rr = nfe_data["ruby_rose_items"]
    msg = f"Cupom processado! {rr} produto(s) Ruby Rose encontrado(s)."
    return {"receipt": receipt, "message": msg, "cashback_earned": nfe_data["cashback_total"], "points_earned": nfe_data["points_earned"]}


@app.post("/api/cupom/qrcode")
async def scan_qrcode(request: QRCodeScanRequest):
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
    receipt = _process_nfe(nfe_data, "qrcode")
    rr = nfe_data["ruby_rose_items"]
    msg = f"QR Code processado! {rr} produto(s) Ruby Rose encontrado(s)."
    return {"receipt": receipt, "message": msg, "cashback_earned": nfe_data["cashback_total"], "points_earned": nfe_data["points_earned"]}


@app.get("/api/receipts")
async def get_receipts():
    return {
        "receipts": receipts_db,
        "stats": {
            "total": len(receipts_db),
            "pending": len([r for r in receipts_db if r.get("status") == "pending"]),
            "approved": len([r for r in receipts_db if r.get("status") == "approved"]),
            "cashback_total": sum(r.get("cashback_total", 0) for r in receipts_db if r.get("status") == "approved"),
        },
    }


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
        {"id": 1, "name": "Envie 3 notas fiscais", "description": "Envie 3 cupons fiscais esta semana", "points_reward": 100, "progress": 1, "total": 3, "type": "receipt"},
        {"id": 2, "name": "Compre produtos Skincare", "description": "Compre qualquer produto da linha Skincare", "points_reward": 150, "progress": 0, "total": 1, "type": "purchase"},
        {"id": 3, "name": "Indique um amigo", "description": "Convide um amigo para usar o app", "points_reward": 200, "progress": 0, "total": 1, "type": "referral"},
        {"id": 4, "name": "Cashback semanal", "description": "Acumule R$20 em cashback esta semana", "points_reward": 50, "progress": 12, "total": 20, "type": "cashback"},
    ]
