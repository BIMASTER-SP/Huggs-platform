"""
Utility Functions
=================
Cupom processing, image-upload constants, and other shared helpers.

NFe lookup itself lives in `app.services.nfe` behind the `NfeProvider` adapter —
this module only retains a thin wrapper for backward compatibility with existing
route imports.
"""

import uuid
from datetime import UTC, datetime

from app.config import settings
from app.database import receipts_db
from app.services.nfe import get_nfe_provider

_provider = get_nfe_provider(settings.nfe_provider)


def simulate_nfe_lookup(access_key: str) -> dict:
    """Backward-compat shim that delegates to the configured NfeProvider."""
    return _provider.lookup(access_key)


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
