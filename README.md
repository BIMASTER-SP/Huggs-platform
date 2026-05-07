# Huggs Platform — Ruby Rose B2B

Plataforma de cashback / B2B para Ruby Rose. Monorepo:

- **`rubyrose-backend/`** — Python 3.12 + FastAPI + JWT
- **`rubyrose-frontend/`** — Vite + React 18 + TypeScript + Tailwind + shadcn/ui

## Setup local

### Pré-requisitos
- Python 3.12+, Poetry
- Node.js 20+, npm

### Backend

```bash
cd rubyrose-backend
cp .env.example .env
# Edite .env e gere um JWT_SECRET:  openssl rand -hex 32
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

API em `http://localhost:8000` — docs em `/docs`.

### Frontend

```bash
cd rubyrose-frontend
cp .env.example .env  # se existir; senao crie com VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

App em `http://localhost:5173`.

## Variáveis de ambiente — backend

Veja `rubyrose-backend/.env.example` para a lista completa. Resumo:

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Chave de assinatura JWT (≥ 32 chars). App falha no boot se ausente. |
| `ALLOWED_ORIGINS` | — | `http://localhost:5173` | CORS, CSV de origens. |
| `JWT_EXPIRATION_HOURS` | — | `24` | Validade do token. |
| `LOG_LEVEL` | — | `INFO` | `DEBUG`/`INFO`/`WARNING`/`ERROR`. |
| `RATE_LIMIT_LOGIN` | — | `5/minute` | Limite no `/api/auth/login`. |
| `RATE_LIMIT_REGISTER` | — | `3/hour` | Limite no `/api/auth/register`. |
| `RATE_LIMIT_CUPOM_LOOKUP` | — | `10/minute` | Limite no `/api/receipts/lookup` e `/scan`. |

## Estrutura

```
rubyrose-backend/
├── app/
│   ├── main.py            # bootstrap, CORS, rate limit, routers
│   ├── config.py          # pydantic-settings (env + .env)
│   ├── auth.py            # JWT, bcrypt, RBAC dependencies
│   ├── database.py        # in-memory storage (PR 2: SQLAlchemy)
│   ├── logger.py          # logger JSON estruturado
│   ├── rate_limit.py      # slowapi limiter compartilhado
│   ├── responses.py       # success/error padronizados
│   ├── utils.py           # helpers (NFe sim, upload)
│   └── routes/            # 13 routers por domínio

rubyrose-frontend/
├── src/
│   ├── App.tsx            # monolito 1280 linhas (PR 4: split)
│   ├── lib/utils.ts
│   └── ...
```

## Segurança

- ⚠️ **Token vazado no histórico do git** (`rubyrose-frontend/.env` antigo). Removido do tracking — **rotação manual no devinapps.com pendente.**
- JWT_SECRET é obrigatório (≥ 32 chars) e validado no boot — sem fallback inseguro.
- CORS restrito por `ALLOWED_ORIGINS`.
- Rate limit em endpoints sensíveis via slowapi (login, register, cupom lookup/scan).
- Senhas hashed com bcrypt.

## Roadmap de profissionalização

- [x] **PR 1** — JWT fail-fast, CORS por env, rate limit, `.env.example`, `.gitignore` backend, README.
- [ ] **PR 2** — SQLAlchemy 2.x + Alembic + `DATABASE_URL` (SQLite dev / Postgres prod).
- [ ] **PR 3** — pytest + vitest + GitHub Actions + pre-commit.
- [ ] **PR 4** — Split `App.tsx`, react-router, service layer, design tokens.
