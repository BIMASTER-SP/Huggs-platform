"""
Pydantic Models (Request/Response Schemas)
==========================================
All request and response models are centralized here.
Validates input data before it reaches the service layer.

Future migration path:
  - Add SQLAlchemy ORM models alongside Pydantic schemas
  - Use Pydantic's orm_mode for automatic serialization
"""


from pydantic import BaseModel


# ============================================================
# AUTH MODELS
# ============================================================
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    cpf: str | None = None
    phone: str | None = None
    store_cnpj: str | None = None
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
    photo_url: str | None = None
    photo_base64: str | None = None
    notes: str | None = None


class ChallengeCreateRequest(BaseModel):
    title: str
    description: str
    type: str
    reward_kit_id: str | None = None
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
    shipping_address: str | None = None


# ============================================================
# BANNER MODELS
# ============================================================
class BannerCreateRequest(BaseModel):
    title: str
    subtitle: str | None = None
    description: str | None = None
    image_url: str | None = None
    color: str | None = "purple"
    highlight: bool = False
    position: int = 1
    active: bool = True
    start_date: str | None = None
    end_date: str | None = None


class BannerUpdateRequest(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    image_url: str | None = None
    color: str | None = None
    highlight: bool | None = None
    position: int | None = None
    active: bool | None = None
    start_date: str | None = None
    end_date: str | None = None


# ============================================================
# INTEGRATION MODELS
# ============================================================
class StockUpdateRequest(BaseModel):
    product_ean: str
    quantity: int
    warehouse: str | None = "principal"


class CatalogItemRequest(BaseModel):
    ean: str
    name: str
    category: str
    brand: str
    price: float
    description: str | None = None
    image_url: str | None = None


class PriceUpdateRequest(BaseModel):
    product_id: int
    new_price: float
    effective_date: str | None = None


class PromotionRequest(BaseModel):
    name: str
    description: str | None = None
    discount_percent: float | None = None
    bonus_points: float | None = None
    product_ids: list[int] | None = None
    start_date: str
    end_date: str
    active: bool = True


class WebhookRegisterRequest(BaseModel):
    url: str
    events: list[str]
    secret: str | None = None
    description: str | None = None


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
    name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    website: str | None = None
    cnpj: str | None = None
    address: str | None = None
    about: str | None = None


class AdminProductRequest(BaseModel):
    name: str
    ean: str | None = None
    price: float
    category: str
    description: str | None = None
    min_order: int = 1
    image: str | None = None
    stock_available: bool = True


class AdminProductUpdate(BaseModel):
    name: str | None = None
    ean: str | None = None
    price: float | None = None
    category: str | None = None
    description: str | None = None
    min_order: int | None = None
    image: str | None = None
    stock_available: bool | None = None


class AdminCreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "promotora"
    cpf: str | None = None
    phone: str | None = None
    store_cnpj: str | None = None
    status: str = "active"


class AdminEditUserRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    role: str | None = None
    status: str | None = None
    store_cnpj: str | None = None


class AdminStoreRequest(BaseModel):
    cnpj: str
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    vendedor_ruby_id: str | None = None


class AdminStockUpdateRequest(BaseModel):
    product_id: int | None = None
    product_name: str | None = None
    ean: str | None = None
    quantity: int
    low_stock_alert: int = 10
    warehouse: str = "SP Principal"


class AdminImageRequest(BaseModel):
    name: str
    url: str
    product_id: int | None = None
    product_name: str | None = None
    type: str = "produto"


class AdminIntegrationRequest(BaseModel):
    name: str
    type: str = "erp"
    api_url: str = ""
    api_key: str = ""
    description: str = ""
    active: bool = True
