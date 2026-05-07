# Huggs Platform — handoff

Plataforma de cashback B2B (RubyRose). Monorepo com backend Python/FastAPI + frontend React/Vite.

## Como rodar (mais fácil — Docker)

```bash
unzip Huggs-platform.zip && cd Huggs-platform
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000 (docs Swagger em `/docs`)
- Postgres: localhost:5432 (user/pass: `rubyrose`/`rubyrose`)

## Sem Docker

**Pré-requisitos:** Python 3.12 + Poetry, Node.js 20+, npm.

```bash
# Backend (terminal 1)
cd rubyrose-backend
cp .env.example .env       # gere um JWT_SECRET ≥32 chars
poetry install
poetry run uvicorn app.main:app --reload --port 8000

# Frontend (terminal 2)
cd rubyrose-frontend
echo "VITE_API_URL=http://localhost:8000" > .env
npm install
npm run dev
```

## Credenciais de teste (já seedadas no DB)

| Email | Senha | Role |
|---|---|---|
| `ana@email.com` | `ana123` | promotora |
| `admin@rubyrose.com.br` | `admin123` | admin |
| `carlos@email.com` | `carlos123` | vendedor_ruby |

## Stack

- **Backend:** FastAPI 0.135, SQLAlchemy 2, JWT (bcrypt), slowapi rate limit, pydantic-settings
- **Frontend:** React 18, Vite 6, TypeScript, Tailwind, react-router 7, lucide-react, recharts
- **DB:** SQLite (dev default) ou Postgres (via `DATABASE_URL`)
- **Tests:** pytest (35 backend) + vitest (27 frontend)
- **CI:** GitHub Actions matrix (lint + test + build) — config em `.github/workflows/ci.yml`

## Estrutura

```
rubyrose-backend/app/
  main.py         # FastAPI app + lifespan + middleware
  config.py       # pydantic-settings (env validation)
  auth.py         # JWT + bcrypt + RBAC dependencies
  db.py           # SQLAlchemy engine + session
  db_models.py    # 19 ORM models (User, Order, Banner, etc.)
  database.py     # in-memory mirror + persistence helpers
  rate_limit.py   # slowapi limiter
  services/nfe.py # NfeProvider adapter (Mock + Méliuz stub)
  routes/         # 13 routers por domínio (auth, catalog, orders, lgpd, admin...)

rubyrose-frontend/src/
  App.tsx         # router shell (~30 linhas)
  MainApp.tsx     # state + orquestração (~360 linhas)
  lib/            # api.ts (HTTP), routes.ts (Page↔URL), types.ts
  contexts/       # Auth, Cart, Toast
  components/     # AdminSidebar, AppModals, BottomNav, Toast, ProtectedRoute
  pages/          # Login, Inicio, Catalogo, Pedidos, Desafios, Perfil
  pages/admin/    # AdminPages.tsx (10 sub-pages com Recharts)
  services/       # auth, catalog, orders, lgpd typed clients
```

## Comandos úteis

```bash
# Backend
cd rubyrose-backend
poetry run pytest                 # 35 tests
poetry run ruff check .           # lint
poetry run ruff check --fix .     # autofix

# Frontend
cd rubyrose-frontend
npm test                          # 27 tests
npm run lint                      # 0 errors, 73 warnings (any type — débito conhecido)
npm run build                     # tsc + vite

# Stack toda
docker compose up --build         # postgres + backend + frontend
docker compose down -v            # parar e limpar volumes
```

## Variáveis de ambiente (backend)

`rubyrose-backend/.env.example` lista todas. As principais:

| Var | Obrigatória | Default |
|---|---|---|
| `JWT_SECRET` | ✅ (≥32 chars) | — fail-fast no boot se ausente |
| `DATABASE_URL` | — | `sqlite:///./rubyrose.db` |
| `ALLOWED_ORIGINS` | — | `http://localhost:5173` (CSV) |
| `NFE_PROVIDER` | — | `mock` (alternativa: `meliuz` stub) |
| `RATE_LIMIT_LOGIN` | — | `5/minute` |

## O que está pronto

- ✅ Auth JWT + RBAC (promotora/admin/vendedor_ruby/gerente_loja)
- ✅ Persistência DB (User, Store, Order, LgpdConsent crash-safe; resto via flush no shutdown)
- ✅ LGPD compliance (consent, export `/api/lgpd/export`, delete `/api/lgpd/data`)
- ✅ Rate limit em login/register/cupom lookup
- ✅ NfeProvider adapter (Mock ativo, Méliuz stub pronto pra wire)
- ✅ Pages: Login, Início, Catálogo, Pedidos, Desafios, Perfil + 10 admin (Dashboard com Recharts, Users, Products, Banners, Orders, Company, Logs, Stock, Images, Integrations)
- ✅ React-router URLs reais (deep-linkable)
- ✅ Service layer (`src/services/`)
- ✅ CI + Dependabot + pre-commit hooks

## Pendências conhecidas (boas tasks pra começar)

1. **Alembic init** — schema atualmente cria via `Base.metadata.create_all`. Próximo passo: `poetry run alembic init alembic` + initial migration
2. **Tipar pages** — `Catalogo`, `Pedidos`, `Desafios`, `Perfil`, `AdminPages` ainda têm `any` (73 warnings de eslint)
3. **MeliuzNfeProvider** em `app/services/nfe.py` é stub — wirar `httpx.post(...)` pra SEFAZ
4. **TanStack Query** — substituir callback fetching por cache + invalidation
5. **Code-split** do bundle frontend (atualmente ~700KB, Vite avisa)

## ⚠️ Aviso de segurança

Houve um token Basic Auth do tunnel `devinapps.com` commitado no histórico do git (foi removido do tracking mas continua no histórico). Se for usar essa app em produção, **rotacione/revogue** esse token primeiro. Detalhes no commit `8cb63e9`.

## Repo no GitHub

https://github.com/BIMASTER-SP/Huggs-platform — público, dá pra clonar direto:

```bash
git clone https://github.com/BIMASTER-SP/Huggs-platform.git
```
