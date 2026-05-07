"""
Repository Layer - In-Memory Database
=====================================
All data access is centralized here following the Repository Pattern.
When migrating to AWS RDS/DynamoDB, only this file needs to change.
The rest of the application (services, routes) remains untouched.

Future migration path:
  - Replace dict/list stores with SQLAlchemy models + session
  - Swap seed_data() with Alembic migrations
  - Add connection pooling for RDS
"""

from datetime import datetime, timezone
import bcrypt

# ============================================================
# IN-MEMORY DATA STORES
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
admin_stock_db: list[dict] = []
admin_images_db: list[dict] = []
admin_integrations_db: list[dict] = []
activity_logs_db: list[dict] = []

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

# ============================================================
# PRODUCT CATALOG (in-memory, ready for DB migration)
# ============================================================
CATALOG_PRODUCTS: list[dict] = []

# EAN-to-product mapping for NFe simulation
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


def seed_data():
    """Initialize database with seed data. Called once at startup."""
    now = datetime.now(timezone.utc).isoformat()

    # Seed users
    admin_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
    ana_hash = bcrypt.hashpw("ana123".encode(), bcrypt.gensalt()).decode()
    carlos_hash = bcrypt.hashpw("carlos123".encode(), bcrypt.gensalt()).decode()

    users_db["admin@rubyrose.com.br"] = {
        "id": "admin-001", "name": "Admin Ruby Rose", "email": "admin@rubyrose.com.br",
        "cpf": "000.000.000-00", "phone": "(11) 99999-0000", "password_hash": admin_hash,
        "role": "admin", "status": "active", "store_cnpj": None, "points": 0,
        "level": "Admin", "total_orders": 0, "total_order_value": 0.0,
        "challenges_completed": 0, "receipts_count": 0, "created_at": now,
        "lgpd_consent": True, "lgpd_consent_date": now,
    }
    users_db["ana@email.com"] = {
        "id": "promotora-001", "name": "Ana Silva", "email": "ana@email.com",
        "cpf": "111.111.111-11", "phone": "(11) 98888-1111", "password_hash": ana_hash,
        "role": "promotora", "status": "active", "store_cnpj": "12345678000190",
        "points": 350, "level": "Bronze", "total_orders": 2, "total_order_value": 1656.00,
        "challenges_completed": 1, "receipts_count": 3, "created_at": now,
        "lgpd_consent": True, "lgpd_consent_date": now,
    }
    users_db["carlos@email.com"] = {
        "id": "vendedor-001", "name": "Carlos Vendedor Ruby", "email": "carlos@email.com",
        "cpf": "222.222.222-22", "phone": "(11) 97777-2222", "password_hash": carlos_hash,
        "role": "vendedor_ruby", "status": "active", "store_cnpj": None, "points": 0,
        "level": "Vendedor", "total_orders": 0, "total_order_value": 0.0,
        "challenges_completed": 0, "receipts_count": 0, "created_at": now,
        "lgpd_consent": True, "lgpd_consent_date": now,
    }

    # Seed stores
    stores_db["12345678000190"] = {
        "cnpj": "12345678000190", "name": "Perfumaria Bella Vista",
        "address": "Rua das Flores, 123", "city": "Sao Paulo", "state": "SP",
        "phone": "(11) 3333-4444", "vendedor_ruby_id": "vendedor-001",
        "status": "active", "created_at": now,
    }
    stores_db["98765432000110"] = {
        "cnpj": "98765432000110", "name": "Beauty Box Centro",
        "address": "Av. Paulista, 1500", "city": "Sao Paulo", "state": "SP",
        "phone": "(11) 3333-5555", "vendedor_ruby_id": "vendedor-001",
        "status": "active", "created_at": now,
    }

    # Seed catalog products (15 products)
    products = [
        {"id": 1, "ean": "7896522800012", "name": "Base Liquida HD Ruby Rose", "image": "base", "price": 39.90, "category": "Maquiagem", "description": "Base liquida de alta definicao com cobertura total", "min_order": 6, "stock_available": True},
        {"id": 2, "ean": "7896522800029", "name": "Paleta de Sombras 18 Cores", "image": "paleta", "price": 59.90, "category": "Maquiagem", "description": "Paleta profissional com 18 cores vibrantes", "min_order": 3, "stock_available": True},
        {"id": 3, "ean": "7896522800036", "name": "Batom Matte Longa Duracao", "image": "batom", "price": 19.90, "category": "Maquiagem", "description": "Batom matte com duracao de ate 12 horas", "min_order": 12, "stock_available": True},
        {"id": 4, "ean": "7896522800043", "name": "Mascara de Cilios Volume Max", "image": "mascara", "price": 29.90, "category": "Maquiagem", "description": "Mascara para cilios volumosos e definidos", "min_order": 6, "stock_available": True},
        {"id": 5, "ean": "7896522800050", "name": "Po Compacto HD", "image": "po", "price": 25.90, "category": "Maquiagem", "description": "Po compacto HD com efeito matte natural", "min_order": 6, "stock_available": True},
        {"id": 6, "ean": "7896522800067", "name": "Primer Facial Hidratante", "image": "primer", "price": 34.90, "category": "Skincare", "description": "Primer hidratante para preparacao da pele", "min_order": 6, "stock_available": True},
        {"id": 7, "ean": "7896522800074", "name": "Serum Vitamina C", "image": "serum", "price": 44.90, "category": "Skincare", "description": "Serum antioxidante com vitamina C pura", "min_order": 3, "stock_available": True},
        {"id": 8, "ean": "7896522800081", "name": "Agua Micelar 200ml", "image": "micelar", "price": 22.90, "category": "Skincare", "description": "Agua micelar para limpeza suave", "min_order": 6, "stock_available": True},
        {"id": 9, "ean": "7896522800098", "name": "Kit Pinceis Maquiagem 12pcs", "image": "pinceis", "price": 79.90, "category": "Acessorios", "description": "Kit profissional com 12 pinceis de maquiagem", "min_order": 2, "stock_available": True},
        {"id": 10, "ean": "7896522800104", "name": "Esmalte Gel Ruby Rose", "image": "esmalte", "price": 12.90, "category": "Unhas", "description": "Esmalte gel de longa duracao", "min_order": 12, "stock_available": True},
        {"id": 11, "ean": "7896522800111", "name": "Lip Gloss Volumizador", "image": "gloss", "price": 24.90, "category": "Maquiagem", "description": "Lip gloss com efeito volumizador", "min_order": 6, "stock_available": True},
        {"id": 12, "ean": "7896522800128", "name": "Corretivo Liquido HD", "image": "corretivo", "price": 21.90, "category": "Maquiagem", "description": "Corretivo liquido de alta cobertura", "min_order": 6, "stock_available": True},
        {"id": 13, "ean": "7896522800135", "name": "Blush Compacto Duo", "image": "blush", "price": 27.90, "category": "Maquiagem", "description": "Blush duo com duas tonalidades", "min_order": 6, "stock_available": True},
        {"id": 14, "ean": "7896522800142", "name": "Protetor Solar Facial FPS50", "image": "protetor", "price": 49.90, "category": "Skincare", "description": "Protetor solar facial com alta protecao", "min_order": 3, "stock_available": True},
        {"id": 15, "ean": "7896522800159", "name": "Demaquilante Bifasico", "image": "demaquilante", "price": 26.90, "category": "Skincare", "description": "Demaquilante bifasico para remocao completa", "min_order": 6, "stock_available": True},
    ]
    CATALOG_PRODUCTS.extend(products)

    # Seed challenges
    challenges_db.extend([
        {"id": "challenge-001", "title": "Foto Vitrine Maquiagem", "description": "Tire uma foto da vitrine de maquiagem Ruby Rose na sua loja", "type": "vitrine", "reward_kit_id": "kit-001", "points_reward": 100, "goal": 1, "active": True, "start_date": "2026-03-01", "end_date": "2026-04-30", "created_by": "admin-001"},
        {"id": "challenge-002", "title": "3 Pedidos no Mes", "description": "Faca 3 pedidos de reposicao neste mes", "type": "pedido", "reward_kit_id": "kit-002", "points_reward": 200, "goal": 3, "active": True, "start_date": "2026-03-01", "end_date": "2026-03-31", "created_by": "admin-001"},
        {"id": "challenge-003", "title": "Campanha Skincare", "description": "Venda 10 produtos da linha Skincare", "type": "venda", "reward_kit_id": None, "points_reward": 150, "goal": 10, "active": True, "start_date": "2026-03-01", "end_date": "2026-05-31", "created_by": "admin-001"},
        {"id": "challenge-004", "title": "Cadastro Nova Loja", "description": "Indique uma nova loja parceira para a rede Ruby Rose", "type": "indicacao", "reward_kit_id": "kit-003", "points_reward": 300, "goal": 1, "active": True, "start_date": "2026-03-01", "end_date": "2026-06-30", "created_by": "admin-001"},
    ])

    # Seed reward kits
    reward_kits_db.extend([
        {"id": "kit-001", "name": "Kit Maquiagem Basico", "description": "Base HD + Batom Matte + Po Compacto", "points_cost": 200, "image": "kit1", "items": ["Base Liquida HD", "Batom Matte", "Po Compacto"], "available": True},
        {"id": "kit-002", "name": "Kit Skincare Premium", "description": "Serum Vitamina C + Agua Micelar + Primer", "points_cost": 350, "image": "kit2", "items": ["Serum Vitamina C", "Agua Micelar", "Primer Facial"], "available": True},
        {"id": "kit-003", "name": "Kit Completo Ruby Rose", "description": "Paleta 18 Cores + Kit Pinceis + Mascara", "points_cost": 500, "image": "kit3", "items": ["Paleta 18 Cores", "Kit Pinceis 12pcs", "Mascara Volume Max"], "available": True},
        {"id": "kit-004", "name": "Kit Unha Perfeita", "description": "6 Esmaltes Gel + Removedor", "points_cost": 150, "image": "kit4", "items": ["Esmalte Gel x6", "Removedor"], "available": True},
        {"id": "kit-005", "name": "Kit Top Seller", "description": "Produtos mais vendidos do mes", "points_cost": 400, "image": "kit5", "items": ["Base HD", "Paleta 18 Cores", "Serum Vitamina C", "Lip Gloss"], "available": True},
    ])

    # Seed banners
    banners_db.extend([
        {"id": "banner-001", "title": "Lancamento Linha Verao", "subtitle": "Novas cores e texturas", "description": "Confira a nova colecao de verao Ruby Rose", "image_url": None, "color": "rose", "highlight": True, "position": 1, "active": True, "start_date": "2026-03-01", "end_date": "2026-04-30", "created_by": "admin-001", "created_at": now, "updated_at": now},
        {"id": "banner-002", "title": "Desafio Vitrine", "subtitle": "Ganhe pontos extras", "description": "Participe do desafio de vitrine e ganhe ate 300 pontos", "image_url": None, "color": "purple", "highlight": False, "position": 2, "active": True, "start_date": "2026-03-01", "end_date": "2026-03-31", "created_by": "admin-001", "created_at": now, "updated_at": now},
        {"id": "banner-003", "title": "Frete Gratis", "subtitle": "Pedidos acima de R$500", "description": "Aproveite frete gratis em pedidos acima de R$500", "image_url": None, "color": "emerald", "highlight": False, "position": 3, "active": True, "start_date": "2026-03-01", "end_date": "2026-05-31", "created_by": "admin-001", "created_at": now, "updated_at": now},
    ])

    # Seed orders
    orders_db.extend([
        {"id": "order-001", "user_id": "promotora-001", "store_cnpj": "12345678000190", "store_name": "Perfumaria Bella Vista", "items": [{"product_id": 1, "name": "Base Liquida HD Ruby Rose", "quantity": 12, "unit_price": 39.90, "total": 478.80}, {"product_id": 3, "name": "Batom Matte Longa Duracao", "quantity": 24, "unit_price": 19.90, "total": 477.60}, {"product_id": 5, "name": "Po Compacto HD", "quantity": 6, "unit_price": 25.90, "total": 155.40}], "total_value": 1111.80, "points_earned": 55, "status": "entregue", "vendedor_ruby_id": "vendedor-001", "created_at": "2026-02-15T10:30:00", "updated_at": "2026-02-20T14:00:00"},
        {"id": "order-002", "user_id": "promotora-001", "store_cnpj": "12345678000190", "store_name": "Perfumaria Bella Vista", "items": [{"product_id": 7, "name": "Serum Vitamina C", "quantity": 6, "unit_price": 44.90, "total": 269.40}, {"product_id": 8, "name": "Agua Micelar 200ml", "quantity": 12, "unit_price": 22.90, "total": 274.80}], "total_value": 544.20, "points_earned": 27, "status": "em_transito", "vendedor_ruby_id": "vendedor-001", "created_at": "2026-03-08T09:15:00", "updated_at": "2026-03-10T11:00:00"},
    ])

    # Seed admin stock
    admin_stock_db.extend([
        {"id": "stock-001", "product_id": 1, "product_name": "Base Liquida HD", "ean": "7896522800012", "quantity": 150, "low_stock_alert": 20, "warehouse": "SP Principal", "last_updated": now},
        {"id": "stock-002", "product_id": 2, "product_name": "Paleta de Sombras 18 Cores", "ean": "7896522800029", "quantity": 8, "low_stock_alert": 15, "warehouse": "SP Principal", "last_updated": now},
        {"id": "stock-003", "product_id": 3, "product_name": "Batom Matte Longa Duracao", "ean": "7896522800036", "quantity": 200, "low_stock_alert": 30, "warehouse": "SP Principal", "last_updated": now},
        {"id": "stock-004", "product_id": 4, "product_name": "Mascara de Cilios Volume", "ean": "7896522800043", "quantity": 5, "low_stock_alert": 10, "warehouse": "RJ Filial", "last_updated": now},
        {"id": "stock-005", "product_id": 5, "product_name": "Po Compacto HD", "ean": "7896522800050", "quantity": 75, "low_stock_alert": 15, "warehouse": "SP Principal", "last_updated": now},
    ])

    # Seed admin images
    admin_images_db.extend([
        {"id": "img-001", "name": "Base Liquida HD - Frente", "url": "https://via.placeholder.com/300x300/BE185D/fff?text=Base+HD", "product_id": 1, "product_name": "Base Liquida HD", "type": "produto", "size": 45000, "created_at": now},
        {"id": "img-002", "name": "Paleta Sombras - Aberta", "url": "https://via.placeholder.com/300x300/EC4899/fff?text=Paleta+18", "product_id": 2, "product_name": "Paleta de Sombras 18 Cores", "type": "produto", "size": 62000, "created_at": now},
        {"id": "img-003", "name": "Banner Home Verao", "url": "https://via.placeholder.com/800x300/BE185D/fff?text=Verao+RR", "product_id": None, "product_name": None, "type": "banner", "size": 85000, "created_at": now},
    ])

    # Seed admin integrations
    admin_integrations_db.extend([
        {"id": "int-001", "name": "ERP Totvs", "type": "erp", "api_url": "https://api.totvs.com/v1", "api_key": "sk-***...***abc", "description": "Integracao com ERP Totvs para estoque e pedidos", "active": True, "status": "connected", "last_sync": now},
        {"id": "int-002", "name": "Correios API", "type": "logistica", "api_url": "https://api.correios.com.br/v2", "api_key": "cr-***...***xyz", "description": "Rastreamento de entregas via Correios", "active": True, "status": "connected", "last_sync": now},
        {"id": "int-003", "name": "Bling ERP", "type": "erp", "api_url": "https://api.bling.com.br/v3", "api_key": "", "description": "Integracao alternativa com Bling (nao configurada)", "active": False, "status": "disconnected", "last_sync": None},
    ])
