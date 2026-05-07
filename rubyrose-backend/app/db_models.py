"""
ORM models for the persistent entities.

All in-memory dicts/lists in `app/database.py` are mirrored here. Routes still
mutate the dicts (no rewrites needed); the `save_*` helpers in `app/database.py`
upsert each row to disk. Boot-time `hydrate_from_db()` reverses the flow.

JSON columns for nested arrays (Order.items, RewardKit.items, Receipt.items,
CompanySettings, CatalogProduct.raw, AdminStock.raw, etc.) are intentional —
those payloads are atomic from the UI's perspective and never queried in
isolation, so denormalization beats joining child tables here.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class StoreRow(Base):
    __tablename__ = "stores"

    cnpj: Mapped[str] = mapped_column(String(18), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    address: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(80), default="")
    state: Mapped[str] = mapped_column(String(2), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    vendedor_ruby_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    users: Mapped[list["UserRow"]] = relationship(back_populates="store")


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    cpf: Mapped[str] = mapped_column(String(20), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default="promotora")
    status: Mapped[str] = mapped_column(String(20), default="pendente")

    store_cnpj: Mapped[str | None] = mapped_column(ForeignKey("stores.cnpj"), nullable=True)
    store: Mapped["StoreRow | None"] = relationship(back_populates="users")

    points: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[str] = mapped_column(String(20), default="Bronze")
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_order_value: Mapped[float] = mapped_column(Float, default=0.0)
    challenges_completed: Mapped[int] = mapped_column(Integer, default=0)
    receipts_count: Mapped[int] = mapped_column(Integer, default=0)

    lgpd_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    lgpd_consent_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OrderRow(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    store_cnpj: Mapped[str] = mapped_column(String(18), index=True)
    store_name: Mapped[str] = mapped_column(String(120))

    # Line items: [{product_id, name, quantity, unit_price, total}, ...].
    # Denormalized on purpose — orders are append-only; items never change post-create.
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    total_value: Mapped[float] = mapped_column(Float, default=0.0)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="enviado")
    vendedor_ruby_id: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class LgpdConsentRow(Base):
    __tablename__ = "lgpd_consents"

    user_email: Mapped[str] = mapped_column(String(120), primary_key=True)
    consent_data_collection: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_marketing: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_third_party: Mapped[bool] = mapped_column(Boolean, default=False)
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ============================================================
# Generic JSON-blob rows for entities the UI treats as opaque payloads.
# Each has a string `id` PK + a JSON `data` field with the original dict shape.
# ============================================================

class _JsonRow(Base):
    """Abstract base — concrete subclasses just set __tablename__."""
    __abstract__ = True

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class BannerRow(_JsonRow):
    __tablename__ = "banners"


class RewardKitRow(_JsonRow):
    __tablename__ = "reward_kits"


class RedemptionRow(_JsonRow):
    __tablename__ = "redemptions"


class ChallengeRow(_JsonRow):
    __tablename__ = "challenges"


class ChallengeSubmissionRow(_JsonRow):
    __tablename__ = "challenge_submissions"


class ReceiptRow(_JsonRow):
    __tablename__ = "receipts"


class WebhookRow(_JsonRow):
    __tablename__ = "webhooks"


class ActivityLogRow(_JsonRow):
    __tablename__ = "activity_logs"


class CatalogProductRow(_JsonRow):
    __tablename__ = "catalog_products"


class AdminStockRow(_JsonRow):
    __tablename__ = "admin_stock"


class AdminImageRow(_JsonRow):
    __tablename__ = "admin_images"


class AdminIntegrationRow(_JsonRow):
    __tablename__ = "admin_integrations"


class IntegrationStockRow(_JsonRow):
    __tablename__ = "integration_stock"


class IntegrationCatalogRow(_JsonRow):
    __tablename__ = "integration_catalog"


class IntegrationPriceRow(_JsonRow):
    __tablename__ = "integration_prices"


class IntegrationPromotionRow(_JsonRow):
    __tablename__ = "integration_promotions"


class CompanySettingsRow(Base):
    """Singleton — a single row keyed by 'singleton'."""
    __tablename__ = "company_settings"

    id: Mapped[str] = mapped_column(String(16), primary_key=True, default="singleton")
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
