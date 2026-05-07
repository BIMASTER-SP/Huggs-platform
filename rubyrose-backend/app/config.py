"""
Application Configuration
=========================
Centralized settings via pydantic-settings. Loads from environment and `.env` file.

All values are validated at startup — the app fails fast if required vars are missing
or invalid, instead of silently using insecure defaults.
"""

from typing import Annotated

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _csv_to_list(value):
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return value


# `NoDecode` keeps pydantic-settings from trying to parse the env var as JSON
# (which breaks for plain CSV input). Our `BeforeValidator` then handles the split.
CSVList = Annotated[list[str], NoDecode, BeforeValidator(_csv_to_list)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    allowed_origins: CSVList = Field(default_factory=lambda: ["http://localhost:5173"])

    # Database. SQLite by default (dev / CI), Postgres in prod via DATABASE_URL.
    database_url: str = "sqlite:///./rubyrose.db"
    database_echo: bool = False

    # NFe / cupom-fiscal provider — see app/services/nfe.py for impls.
    nfe_provider: str = "mock"  # "mock" | "meliuz"

    log_level: str = "INFO"

    rate_limit_default: str = "100/minute"
    rate_limit_login: str = "5/minute"
    rate_limit_register: str = "3/hour"
    rate_limit_cupom_lookup: str = "10/minute"


settings = Settings()
