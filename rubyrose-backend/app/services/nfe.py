"""
NFe / cupom-fiscal lookup providers.
====================================
Adapter pattern: route layer depends on the abstract `NfeProvider` so
tests can inject a stub and production can plug a real SEFAZ/Méliuz client
without touching call sites.

Selection happens at app startup via `get_nfe_provider()`, which reads
`settings.nfe_provider` (default: `mock`).
"""

from __future__ import annotations

import random
import re
from abc import ABC, abstractmethod
from datetime import UTC, datetime

from app.database import RUBY_ROSE_PRODUCTS_EAN


class NfeProvider(ABC):
    """Resolves an NFe access key into a structured cupom payload."""

    @abstractmethod
    def lookup(self, access_key: str) -> dict:
        """Return the cupom data for `access_key`. Raises if invalid/not found."""


class MockNfeProvider(NfeProvider):
    """Synthetic provider used in dev and CI. Generates plausible Ruby Rose carts."""

    _STORES = (
        "Perfumaria Bella Vista", "MakeB Store", "Beauty Box",
        "Rede Farma", "Perfumaria Central",
    )
    _CITIES = ("Sao Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba")

    def lookup(self, access_key: str) -> dict:
        clean_key = re.sub(r"\D", "", access_key)
        all_products = list(RUBY_ROSE_PRODUCTS_EAN.items())
        selected = random.sample(all_products, min(random.randint(1, 4), len(all_products)))
        items: list[dict] = []
        total_value = 0.0
        total_points = 0
        for ean, product in selected:
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
        return {
            "access_key": clean_key,
            "store_name": random.choice(self._STORES),
            "store_cnpj": "12345678000190",
            "city": random.choice(self._CITIES),
            "date": datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
            "items": items,
            "total_value": round(total_value, 2),
            "total_points": total_points,
            "ruby_rose_items_count": len(items),
        }


class MeliuzNfeProvider(NfeProvider):
    """Stub for the eventual Méliuz / SEFAZ integration. Not implemented yet."""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def lookup(self, access_key: str) -> dict:
        raise NotImplementedError(
            "MeliuzNfeProvider is a stub. Wire `httpx.post(...)` against the SEFAZ "
            "consulta-NFe endpoint here. Switch via NFE_PROVIDER=meliuz once ready."
        )


_PROVIDER_REGISTRY: dict[str, type[NfeProvider]] = {
    "mock": MockNfeProvider,
    "meliuz": MeliuzNfeProvider,
}


def get_nfe_provider(name: str = "mock", **kwargs) -> NfeProvider:
    """Factory that returns the configured provider. Defaults to MockNfeProvider."""
    cls = _PROVIDER_REGISTRY.get(name.lower())
    if cls is None:
        raise ValueError(f"Unknown NFe provider: {name!r}. Options: {list(_PROVIDER_REGISTRY)}")
    return cls(**kwargs) if kwargs else cls()
