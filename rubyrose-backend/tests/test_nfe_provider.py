"""Tests for the NfeProvider adapter."""

import pytest

from app.services.nfe import (
    MeliuzNfeProvider,
    MockNfeProvider,
    get_nfe_provider,
)


def test_mock_provider_returns_well_formed_payload():
    provider = MockNfeProvider()
    result = provider.lookup("12345678901234567890123456789012345678901234")
    assert result["access_key"] == "12345678901234567890123456789012345678901234"
    assert result["total_value"] >= 0
    assert isinstance(result["items"], list)
    assert result["ruby_rose_items_count"] == len(result["items"])
    for item in result["items"]:
        assert {"ean", "name", "quantity", "unit_price", "total", "points_earned"}.issubset(item.keys())


def test_mock_provider_strips_non_digits():
    result = MockNfeProvider().lookup("1234-5678 9012")
    assert result["access_key"] == "123456789012"


def test_meliuz_provider_is_a_stub():
    provider = MeliuzNfeProvider(api_key="x", base_url="https://api.example.com/")
    with pytest.raises(NotImplementedError):
        provider.lookup("123")


def test_factory_returns_mock_by_default():
    assert isinstance(get_nfe_provider("mock"), MockNfeProvider)


def test_factory_rejects_unknown_provider():
    with pytest.raises(ValueError, match="Unknown NFe provider"):
        get_nfe_provider("nope")
