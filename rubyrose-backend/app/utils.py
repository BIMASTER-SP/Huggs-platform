"""
Utility Functions
=================
NFe simulation, helpers, and shared utilities.

Future migration path:
  - Replace NFe simulation with real SEFAZ API integration
  - Add S3 upload utilities
  - Add email/notification helpers (SES)
"""

import random
import re
import uuid
from datetime import UTC, datetime

from app.database import RUBY_ROSE_PRODUCTS_EAN, receipts_db


def simulate_nfe_lookup(access_key: str) -> dict:
    """Simulate NFe lookup (replace with real SEFAZ API in production)."""
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
        "city": city, "date": datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        "items": items, "total_value": total_value, "total_points": total_points,
        "ruby_rose_items_count": len(items),
    }


def process_nfe(nfe_data: dict, user: dict | None = None) -> dict:
    """Process a scanned NFe receipt and store it."""
    receipt_id = f"receipt-{uuid.uuid4().hex[:8]}"
    receipt = {
        "id": receipt_id, "access_key": nfe_data["access_key"],
        "store_name": nfe_data["store_name"], "store_cnpj": nfe_data["store_cnpj"],
        "city": nfe_data["city"], "date": nfe_data["date"],
        "total_value": nfe_data["total_value"], "total_points": nfe_data["total_points"],
        "ruby_rose_items": nfe_data["ruby_rose_items_count"], "items": nfe_data["items"],
        "user_id": user["id"] if user else None, "status": "processado",
        "created_at": datetime.now(UTC).isoformat(),
    }
    receipts_db.append(receipt)
    if user:
        user["points"] = user.get("points", 0) + nfe_data["total_points"]
        user["receipts_count"] = user.get("receipts_count", 0) + 1
    return receipt


# Image upload validation constants (prepared for S3)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
UPLOAD_DIR = "uploads"  # Local storage; future: S3 bucket
