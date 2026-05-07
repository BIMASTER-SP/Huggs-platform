# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    PATH="/root/.local/bin:${PATH}"

WORKDIR /app

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.4

# Install deps first (cached layer)
COPY pyproject.toml poetry.lock ./
RUN poetry install --only main --no-root --no-interaction

# App code
COPY app ./app
COPY README.md ./

# Persistence + uploads volumes (mounted in compose / k8s)
RUN mkdir -p /app/uploads && \
    addgroup --system app && adduser --system --group app && \
    chown -R app:app /app

USER app

EXPOSE 8000

# Healthcheck hits /api/health (the route we tested)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health', timeout=3)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
