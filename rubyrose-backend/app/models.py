"""
Pydantic Models (Request/Response Schemas)
==========================================
All request and response models are centralized here.
Validates input data before it reaches the service layer.

Future migration path:
  - Add SQLAlchemy ORM models alongside Pydantic schemas
  - Use Pydantic's orm_mode for automatic serialization
"""

from pydantic import BaseModel, Field
from typing import Optional


# ============================================================
# AUTH MODELS
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


# ============================================================
# ORDER MODELS
# ============================================================
class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]


# ============================================================
# CHALLENGE MODELS
# ============================================================
class ChallengeSubmissionRequest(BaseModel):
    challenge_id: str
    photo_url: Optional[str] = None
    photo_base64: Optional[str] = None
    notes: Optional[str] = None


class ChallengeCreateRequest(BaseModel):
    title: str
    description: str
    type: str
    reward_kit_id: Optional[str] = None
    points_reward: int = 100
    goal: int = 1
    start_date: str
    end_date: str


# ============================================================
# RECEIPT / CUPOM MODELS
# ============================================================
class CupomLookupRequest(BaseModel):
    access_key: str


class QRCodeScanRequest(BaseModel):
    qr_data: str


# ============================================================
# REWARD MODELS
# ============================================================
class RedeemKitRequest(BaseModel):
    kit_id: str
    shipping_address: Optional[str] = None


# ============================================================
# BANNER MODELS
# ============================================================
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


# ============================================================
# INTEGRATION MODELS
# ============================================================
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


class WebhookRegisterRequest(BaseModel):
    url: str
    events: list[str]
    secret: Optional[str] = None
    description: Optional[str] = None


# ============================================================
# LGPD MODELS
# ============================================================
class LGPDConsentRequest(BaseModel):
    consent_data_collection: bool
    consent_marketing: bool = False
    consent_third_party: bool = False


# ============================================================
# ADMIN MODELS
# ============================================================
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


class AdminProductRequest(BaseModel):
    name: str
    ean: Optional[str] = None
    price: float
    category: str
    description: Optional[str] = None
    min_order: int = 1
    image: Optional[str] = None
    stock_available: bool = True


class AdminProductUpdate(BaseModel):
    name: Optional[str] = None
    ean: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    min_order: Optional[int] = None
    image: Optional[str] = None
    stock_available: Optional[bool] = None


class AdminCreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "promotora"
    cpf: Optional[str] = None
    phone: Optional[str] = None
    store_cnpj: Optional[str] = None
    status: str = "active"


class AdminEditUserRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    store_cnpj: Optional[str] = None


class AdminStoreRequest(BaseModel):
    cnpj: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    vendedor_ruby_id: Optional[str] = None


class AdminStockUpdateRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    ean: Optional[str] = None
    quantity: int
    low_stock_alert: int = 10
    warehouse: str = "SP Principal"


class AdminImageRequest(BaseModel):
    name: str
    url: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    type: str = "produto"


class AdminIntegrationRequest(BaseModel):
    name: str
    type: str = "erp"
    api_url: str = ""
    api_key: str = ""
    description: str = ""
    active: bool = True
