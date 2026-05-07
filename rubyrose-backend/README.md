# rubyrose-backend

Backend Python 3.12 + FastAPI da Huggs Platform.

Veja o [README do monorepo](../README.md) para setup, variáveis de ambiente e arquitetura.

## Setup rápido

```bash
cp .env.example .env  # gere JWT_SECRET com `openssl rand -hex 32`
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

API: `http://localhost:8000` — docs: `/docs`.
