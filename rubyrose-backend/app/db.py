"""
Database engine, session factory, declarative Base, and FastAPI dependency.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        kwargs: dict = {"connect_args": {"check_same_thread": False}}
        if ":memory:" in url:
            # Share one in-memory DB across all sessions so tests see consistent state.
            kwargs["poolclass"] = StaticPool
        return kwargs
    return {}


engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    future=True,
    **_engine_kwargs(settings.database_url),
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Iterator[Session]:
    """FastAPI dependency: yields a Session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
