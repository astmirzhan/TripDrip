# TripDrip — Frontend

Web client for the TripDrip API (`../backend`). Built from the Figma design "TripDrip screens" (K7 pixel style + Kazakh steppe scene).

**Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router.

## Run

```bash
# 1. Backend with demo data (from the repo root)
RUN_SEED=true docker compose up --build

# 2. Frontend
cd frontend
cp .env.example .env   # optional, defaults to http://localhost:8080/api/v1
npm install
npm run dev            # http://localhost:5173
```

Demo accounts (password `TripDrip2026!`): `emma.us@demo.tripdrip` (guest), `arman.kz@demo.tripdrip` (local), `claire.fr@demo.tripdrip` (not verified yet).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Backend base URL |
| `VITE_DEMO_CHECKIN` | `false` | Demo only: check in with the stop's own coordinates instead of device GPS |

## Screens

| Route | Figma frame | API |
|---|---|---|
| `/` | 01 Start | — |
| `/signup`, `/login` | 02 Sign up | `POST /auth/register`, `POST /auth/login` |
| `/verify` | 03 Verify | `POST /verifications`, `GET /verifications/me` |
| `/profile` | 04 Profile | `PATCH /me/profile` |
| `/home` | 05 Home | `/qonaq/requests/me`, `/routes/active`, `/wallet` |
| `/phrasebook` | 06 Phrasebook | offline, bundled data |
| `/phrasebook/:id` | 07 Show to a local | offline |
| `/qonaq` (guest) | 08 Қонақ request | `POST /qonaq/requests` |
| `/qonaq` (local) | 09 Лента Қонақ | `GET /qonaq/feed`, `POST /qonaq/requests/{id}/respond` |
| `/partner` | 14 Partner cabinet | `/partner/profile`, `/partner/stats`, `/partner/promocodes/redeem`, `/partner/visits/confirm`, `/partner/offers` |
| `/chats`, `/chats/:id` | 13 Chats | `GET /chats`, `/chats/{id}/messages`, `/network-requests` (accept / decline) |
| `/map` | 10 Map, 10b Person card | `GET /map/entities`, `PATCH /me/map-presence`, `/network-requests`, `/reports`, `/blocks` |
| `/route` | 11 Route & coins | `POST /routes/generate`, `GET /routes/active`, check-in |
| `/route/complete` | 12 Route complete, wallet | `/promocodes/me`, `/offers`, exchange; guest card QR for partner visits |

## Structure

```text
src/
├── api/            # fetch client (JWT + refresh), types mirroring backend DTOs, TanStack Query hooks
├── auth/           # AuthProvider: session, login, register, logout
├── components/
│   ├── ui/         # Figma components: Button, Chip, Input, Coin, Avatar, Sign, LevelNode, Panel
│   └── scene/      # Scene/Steppe background as one SVG
├── features/phrasebook/  # offline phrases + local progress
├── lib/            # helpers and reference data (cities, help types)
└── pages/          # one file per screen
```

Design tokens (colors, fonts, shadows) live in `src/index.css` under `@theme`. SVG assets in `src/assets/figma` are exported from the Figma file.

## Scripts

```bash
npm run dev      # dev server
npm run build    # type-check + production build
npm run lint     # oxlint
```

## Deploy

- **Frontend → Vercel.** Import the repo, set *Root Directory* to `frontend`. `vercel.json` adds SPA rewrites and asset caching. Environment variable: `VITE_API_URL=https://api.tripdrip.macintsh.tech/api/v1`. Domain: `tripdrip.macintsh.tech`.
- **Backend → Railway.** Service from this repo with *Root Directory* `backend` (uses `backend/Dockerfile`, port 8080) plus a Railway Postgres. Variables: `DATABASE_URL` (from Postgres), `JWT_SECRET`, `SERVER_PORT=8080`, `AUTO_MIGRATE=true`, `RUN_SEED=true` (demo data), `AUTO_APPROVE_VERIFICATION=true` (demo: new accounts are verified right after sending documents), `CORS_ORIGINS=https://tripdrip.macintsh.tech`. Domain: `api.tripdrip.macintsh.tech`.
