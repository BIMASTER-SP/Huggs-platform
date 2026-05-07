# Huggs Platform — Ruby Rose B2B

Plataforma de cashback / B2B para Ruby Rose. Monorepo:

- **`rubyrose-backend/`** — Python 3.12 + FastAPI + JWT + SQLAlchemy
- **`rubyrose-frontend/`** — Vite + React 18 + TypeScript + Tailwind + shadcn/ui + react-router

## Setup local (sem Docker)

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

API em `http://localhost:8000` — docs em `/docs`. SQLite cria `rubyrose.db` no primeiro boot.

### Frontend

```bash
cd rubyrose-frontend
cp .env.example .env  # se existir; senão crie com VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

App em `http://localhost:5173`.

## Setup com Docker (1 comando)

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

Stack inteira (Postgres 16 + backend FastAPI + frontend nginx) sobe nas portas 5432/8000/5173. Backend usa Postgres em vez de SQLite.

## Variáveis de ambiente — backend

Veja `rubyrose-backend/.env.example` para a lista completa. Resumo:

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Chave de assinatura JWT (≥ 32 chars). App falha no boot se ausente. |
| `ALLOWED_ORIGINS` | — | `http://localhost:5173` | CORS, CSV de origens. |
| `DATABASE_URL` | — | `sqlite:///./rubyrose.db` | SQLite em dev, Postgres em prod. |
| `JWT_EXPIRATION_HOURS` | — | `24` | Validade do token. |
| `LOG_LEVEL` | — | `INFO` | `DEBUG`/`INFO`/`WARNING`/`ERROR`. |
| `NFE_PROVIDER` | — | `mock` | `mock` (random) ou `meliuz` (stub). Veja `app/services/nfe.py`. |
| `RATE_LIMIT_LOGIN` | — | `5/minute` | Limite no `/api/auth/login`. |
| `RATE_LIMIT_REGISTER` | — | `3/hour` | Limite no `/api/auth/register`. |
| `RATE_LIMIT_CUPOM_LOOKUP` | — | `10/minute` | Limite no `/api/receipts/lookup` e `/scan`. |

## Estrutura

```
rubyrose-backend/
├── app/
│   ├── main.py            # bootstrap, CORS, rate limit, lifespan, routers
│   ├── config.py          # pydantic-settings (env + .env)
│   ├── auth.py            # JWT, bcrypt, RBAC dependencies
│   ├── database.py        # in-memory mirror + DB persistence (hydrate/save/flush)
│   ├── db.py              # SQLAlchemy engine, SessionLocal, get_db dependency
│   ├── db_models.py       # 19 ORM models (4 tipados + 15 JSON-blob)
│   ├── logger.py          # logger JSON estruturado
│   ├── rate_limit.py      # slowapi limiter compartilhado
│   ├── responses.py       # success/error padronizados
│   ├── utils.py           # helpers (cupom processing, upload)
│   ├── services/
│   │   └── nfe.py         # NfeProvider adapter (Mock + Méliuz stub)
│   └── routes/            # 13 routers por domínio
└── tests/                 # pytest: 35 testes (smoke, RBAC, rate limit, persistência)

rubyrose-frontend/
├── src/
│   ├── App.tsx            # router shell (~30 linhas)
│   ├── MainApp.tsx        # state + orquestração (~360 linhas)
│   ├── lib/
│   │   ├── api.ts         # api.get/post/patch/delete tipados
│   │   ├── routes.ts      # Page ↔ URL bidirectional mapping
│   │   └── types.ts       # User, Order, Product, Banner, etc.
│   ├── services/          # auth/catalog/orders/lgpd typed
│   ├── contexts/          # AuthContext, CartContext, ToastContext
│   ├── components/        # AdminSidebar, AppModals, BottomNav, ProtectedRoute, Toast
│   ├── pages/             # Login, Inicio, Catalogo, Pedidos, Desafios, Perfil
│   └── pages/admin/       # AdminPages.tsx (10 admin sub-pages)
└── src/**/*.test.*        # vitest: 27 testes (api, contexts, services, LoginPage, routes)
```

## Persistência

Híbrida (transição):

- **Crash-safe** (typed schema, save após cada mutação): `User`, `Store`, `Order`, `LgpdConsent`
- **Snapshot graceful-shutdown** (JSON-blob, flush no `lifespan` shutdown): `Banner`, `RewardKit`, `Receipt`, `Challenge*`, `Webhook`, `ActivityLog`, `CatalogProduct`, `Admin*`, `Integration*`, `CompanySettings`

Tudo é re-hidratado do disco no startup. SQLite por default, Postgres via `DATABASE_URL`.

## Segurança

- ⚠️ **Token vazado no histórico do git** (`rubyrose-frontend/.env` antigo). Removido do tracking — **rotação manual no devinapps.com pendente** (fora do alcance do código).
- `JWT_SECRET` obrigatório (≥ 32 chars), validado no boot via pydantic-settings — sem fallback.
- CORS restrito por `ALLOWED_ORIGINS`.
- Rate limit em endpoints sensíveis via slowapi (login, register, cupom lookup/scan).
- Senhas hashed com bcrypt.
- LGPD compliant: consent, export (`/api/lgpd/export`), delete account (`/api/lgpd/data`) — todos persistem.

## Tests + CI

```bash
# Backend
cd rubyrose-backend && poetry run pytest    # 35 passed
cd rubyrose-backend && poetry run ruff check .

# Frontend
cd rubyrose-frontend && npm test            # 27 passed
cd rubyrose-frontend && npm run build       # tsc + vite
cd rubyrose-frontend && npm run lint
```

GitHub Actions (`.github/workflows/ci.yml`) roda os 4 comandos acima em paralelo (matrix backend/frontend) em todo PR.

Pre-commit hooks (`.pre-commit-config.yaml`) — `pre-commit install` instala ruff + eslint + checks padrão.

## Roadmap de profissionalização

- [x] **Segurança** — JWT fail-fast, CORS por env, slowapi rate limit, `.env.example`, `.gitignore`.
- [x] **Banco real** — SQLAlchemy 2.x, 19 models, hydrate/flush, SQLite dev / Postgres prod via env.
- [x] **Tests + CI** — pytest (35), vitest (27), GitHub Actions matrix, pre-commit hooks.
- [x] **Frontend refactor** — Page state machine → react-router URLs, service layer, design tokens, contexts (Auth/Cart/Toast), 6 user pages + 10 admin pages extraídos.
- [x] **Méliuz adapter** — `NfeProvider` ABC com `MockNfeProvider` ativo e `MeliuzNfeProvider` stub pronto pra wire.
- [x] **Docker / docker-compose** — Postgres + backend + nginx + healthchecks.
- [ ] **Alembic migrations** — schema atualmente cria via `create_all`. Próximo passo: alembic init + initial migration.
- [ ] **TanStack Query** — substitui o callback-based fetching por cache + invalidation.
