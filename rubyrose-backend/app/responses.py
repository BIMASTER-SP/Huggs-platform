"""
Standardized API Response Module
=================================
All API responses follow a consistent format:
{
    "status": "success" | "error",
    "message": "Human-readable message",
    "data": { ... } | null
}

Future migration path:
  - Add response caching headers for CloudFront CDN
  - Add ETag support for conditional requests
  - Add HATEOAS links for API discoverability
"""

from typing import Any


def success_response(
    data: Any = None,
    message: str = "Operacao realizada com sucesso",
    status_code: int = 200,
) -> dict:
    """Create a standardized success response."""
    return {
        "status": "success",
        "message": message,
        "data": data,
    }


def error_response(
    message: str = "Erro interno do servidor",
    data: Any = None,
) -> dict:
    """Create a standardized error response."""
    return {
        "status": "error",
        "message": message,
        "data": data,
    }


def paginated_response(
    items: list,
    total: int,
    page: int,
    per_page: int,
    message: str = "Dados carregados com sucesso",
) -> dict:
    """Create a standardized paginated response."""
    total_pages = max(1, (total + per_page - 1) // per_page)
    return {
        "status": "success",
        "message": message,
        "data": items,
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }


def apply_pagination(
    items: list,
    page: int = 1,
    per_page: int = 20,
    search: str | None = None,
    search_fields: list[str] | None = None,
    sort_by: str | None = None,
    sort_dir: str = "asc",
    filters: dict | None = None,
) -> tuple[list, int]:
    """
    Apply search, filters, sorting, and pagination to a list of items.
    Returns (paginated_items, total_count_after_filters).
    """
    result = items[:]

    # Apply search across specified fields
    if search and search_fields:
        search_lower = search.lower()
        result = [
            item for item in result
            if any(
                search_lower in str(item.get(field, "")).lower()
                for field in search_fields
            )
        ]

    # Apply filters (exact match)
    if filters:
        for key, value in filters.items():
            if value is not None and value != "":
                result = [item for item in result if str(item.get(key, "")) == str(value)]

    total = len(result)

    # Apply sorting
    if sort_by:
        reverse = sort_dir.lower() == "desc"
        result.sort(key=lambda x: x.get(sort_by, ""), reverse=reverse)

    # Apply pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated = result[start:end]

    return paginated, total
