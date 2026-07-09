# Authentication + PostgreSQL — Technical Specification

## Overview

The entire app is gated behind an account — Campaign, Online PvP, Help, and Updates are all inaccessible until a player logs in. Accounts are email/password today (JWT access token + httpOnly-cookie refresh token), with the data model deliberately OAuth-ready so Google/Facebook login can be added later without a migration. Campaign progress (`highestUnlocked`) is stored per-account in PostgreSQL instead of `localStorage`, so it follows the player across devices.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL |
| ORM | Prisma |
| Password hashing | bcryptjs |
| Access tokens | jsonwebtoken (HS256) |
| Refresh token cookie | cookie-parser |
| Request validation | zod |
| Hosting (DB) | Render Postgres (swappable — see Deployment) |

---

## Architecture

```
Browser                              Node.js Server                    PostgreSQL
───────                              ──────────────                    ──────────
authStore (access token, in memory) ──── REST /auth/*, /campaign-progress ───→ Prisma
        │  Authorization: Bearer          requireAuth middleware
        │  cookie: lou_refresh (httpOnly) verifies JWT / rotates refresh
        │
socket.io-client ─── handshake auth: { token } ──→ io.use() verifies JWT
                                                     socket.data.userId/displayName
```

REST and Socket.io share the same Express process (`server/index.ts`), same as the existing multiplayer server. Nothing about the game-logic layer (`server/game/*`) changes.

---

## Data Model

Five Prisma models (`server/prisma/schema.prisma`):

| Model | Purpose | Key fields |
|---|---|---|
| `User` | Account root — provider-agnostic | `id`, `email` (unique), `displayName` |
| `Credential` | Email/password, 1:1 with `User` | `userId` (unique FK), `passwordHash` |
| `Identity` | OAuth accounts, empty for now | `userId`, `provider`, `providerAccountId`, `email?`; `@@unique([provider, providerAccountId])` |
| `RefreshToken` | Rotation + revocation | `userId`, `tokenHash` (unique), `expiresAt`, `revokedAt?`, `replacedById?` |
| `CampaignProgress` | Replaces `lou_campaign_unlocked` | `userId` (unique FK), `highestUnlocked` (default 1) |

### OAuth Extension Path

`User` intentionally holds no password or provider fields — those live in `Credential` (password) and `Identity` (OAuth), both optional relations. A future Google/Facebook login flow:

1. User authorizes with the provider, server receives the provider's profile (subject id, email).
2. Server looks up `Identity.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } } })`.
3. If found → log in as that `Identity`'s `User`. If not found → create a `User` (or link to an existing one by email, with confirmation) and an `Identity` row.

No `prisma migrate` is needed for this — the table already exists with zero rows. The lookup key is `(provider, providerAccountId)`, not email, because some providers don't guarantee a verified email.

---

## REST Endpoints

All mounted on the existing Express app (`server/index.ts`), previously the only route was `GET /health`.

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/auth/signup` | `{ email, password, displayName }` | `{ user, accessToken }` + sets `lou_refresh` cookie | bcrypt cost 12; creates `User`+`Credential`+`CampaignProgress{highestUnlocked:1}` in one transaction |
| POST | `/auth/login` | `{ email, password }` | `{ user, accessToken }` + sets cookie | generic 401 on any failure — never reveals which field was wrong |
| POST | `/auth/refresh` | — (reads `lou_refresh` cookie) | `{ accessToken }`, rotates cookie | see Token Lifecycle |
| POST | `/auth/logout` | — | `204`, clears cookie | revokes only the current session's token |
| GET | `/auth/me` | — (Bearer) | `{ id, email, displayName, campaignProgress }` | behind `requireAuth` |
| PUT | `/campaign-progress` | `{ highestUnlocked }` | `{ highestUnlocked }` | behind `requireAuth`; server clamps to `max(existing, incoming)` |

---

## Token Lifecycle

- **Access token**: JWT, 15 minutes (`JWT_ACCESS_TTL`), payload `{ sub, email, displayName }`, signed with `JWT_ACCESS_SECRET`. Held in memory on the client only — never `localStorage`.
- **Refresh token**: opaque random 32-byte value, 30 days (`JWT_REFRESH_TTL_DAYS`), stored server-side as a SHA-256 hash (`RefreshToken.tokenHash`) — the raw value only ever lives in the httpOnly cookie.
- **Rotation**: every `/auth/refresh` call revokes the presented token (`revokedAt`, `replacedById` set) and issues a new one.
- **Reuse detection**: if a client presents a token whose `replacedById` is already set, that token was already rotated away — this can only happen from a stolen/replayed token. The server responds by revoking every `RefreshToken` row for that user (`revokedAt = now()` for all), forcing full re-login.
- **Logout**: revokes only the presented token (single-device logout), not the whole chain.

---

## Cookie & CORS Configuration

- Cookie: `lou_refresh`, `httpOnly`, `secure` (prod only), `sameSite: 'none'` (prod) / `'lax'` (dev), `path: /auth`, optional `domain` via `COOKIE_DOMAIN`.
- CORS: `cors({ origin: CLIENT_ORIGIN, credentials: true })` on Express, and `credentials: true` on the Socket.io CORS config. All frontend `fetch()` calls use `credentials: 'include'`.
- **Never put secrets in `VITE_*` env vars** — Vite inlines them into the client bundle at build time. `JWT_ACCESS_SECRET`, `DATABASE_URL`, etc. live only in the server's environment.

---

## Socket.io Identity Integration

Two identity mechanisms coexist, deliberately:

- **`sessionToken`** (unchanged from the original multiplayer implementation) — a purely ephemeral, per-match reconnection key. Its only job is re-attaching a socket to the room it was in after a network blip or refresh.
- **JWT handshake auth** (new) — proves who is connecting and supplies the authoritative `displayName`. Checked once per handshake by `io.use()` in `server/index.ts`, which sets `socket.data.userId`/`socket.data.displayName`.

These are **not** merged: the access token's 15-minute lifetime is shorter than some matches, so tying reconnection to it would break `reconnect_room` exactly when it's needed. `rooms.ts` reads `socket.data.displayName` (falling back to the client-supplied `nickname` only while `REQUIRE_SOCKET_AUTH` is off) instead of trusting the client's claimed name.

### Staged rollout — `REQUIRE_SOCKET_AUTH`

Flipping on mandatory socket auth can reject every live connection at once if there's a bug. `REQUIRE_SOCKET_AUTH=false` (default) lets unauthenticated handshakes through, so the server change can ship ahead of the authenticated frontend build. Set `REQUIRE_SOCKET_AUTH=true` only once the frontend is confirmed live — after that, `io.use()` rejects any handshake without a valid token.

---

## Frontend Auth Flow

- **`src/store/authStore.ts`** — `status: 'checking' | 'authenticated' | 'unauthenticated'`, `user`, `error`. `bootstrap()` runs on app load: calls `/auth/refresh` (cookie-authenticated) then `/auth/me`; on failure, `status` becomes `'unauthenticated'`.
- **`src/network/authClient.ts`** — holds the access token in a module-level variable (never persisted), exposes `signup`/`login`/`logout`/`refresh`/`me`/`putCampaignProgress`, and transparently retries once on a `401` via `/auth/refresh`.
- **`src/App.tsx`** gates before the existing screen switch: `checking` → splash, `unauthenticated` → `LoginScreen`/`SignupScreen` (toggled via `campaignStore`'s `AppScreen` — extended with `'login'`/`'signup'`), `authenticated` → the pre-existing switch, unchanged.

---

## Campaign Progress Sync

`CampaignProgress.highestUnlocked` replaces the `lou_campaign_unlocked` localStorage key. On login/bootstrap, `/auth/me`'s response hydrates `campaignStore.highestUnlocked` in the same round trip (no extra request). `unlockNextStage()` updates the store optimistically, then fires `PUT /campaign-progress` — the server clamps to `max(existing, incoming)` so a stale optimistic write from one session can never regress progress made in another (e.g. the same account open in two tabs).

---

## Security Considerations

- Passwords hashed with bcrypt, cost factor 12.
- Login/signup failures return a generic message — never reveal whether the email or the password was wrong.
- Refresh tokens are stored as SHA-256 hashes, never raw.
- Refresh-token reuse triggers cascade revocation of the user's entire token chain.
- **Not implemented, flagged as follow-up work**: rate-limiting on `/auth/login` and `/auth/signup`, and scheduled cleanup of expired `RefreshToken` rows (the table stays small at this project's scale for now).

---

## Environment Variables

| Var | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | Postgres connection string (Prisma) |
| `JWT_ACCESS_SECRET` | server | Signs/verifies access tokens |
| `JWT_ACCESS_TTL` | server | Access token lifetime (default `15m`) |
| `JWT_REFRESH_TTL_DAYS` | server | Refresh token lifetime in days (default `30`) |
| `COOKIE_DOMAIN` | server | Optional — set only if frontend/backend share a parent domain |
| `REQUIRE_SOCKET_AUTH` | server | Staged-rollout flag for mandatory socket handshake auth |
| `CLIENT_ORIGIN` | server | Existing — now also drives CORS `credentials` origin |

No new frontend (`VITE_*`) env vars are needed — the access token lives in memory and the refresh cookie is managed by the browser against the existing `VITE_SERVER_URL` origin.

---

## Local Development Setup

1. Install a local PostgreSQL server (any version) and make sure it's running.
2. Create a database: `createdb legendofultima` (or via `psql`/a GUI).
3. In `server/.env`, set `DATABASE_URL` to point at it, e.g.
   `postgresql://postgres:<your-password>@localhost:5432/legendofultima?schema=public`.
4. From `server/`, run `npx prisma migrate dev` — this applies the committed
   migrations (starting with `20260706180124_init_auth`, which creates all
   five tables) and regenerates the Prisma client.
5. From the repo root, run `npm run dev:all` to start the Vite frontend
   (`:5173`) and the Express/Socket.io server (`:3001`) together in one
   terminal. `npm run dev` / `npm run dev:server` still work individually.

`server/.env` is gitignored — each developer points it at their own local
Postgres instance. Only `server/.env.example` (placeholder values) is
committed.

---

## Deployment (Render)

`render.yaml` provisions a `databases:` entry (`legendofultima-db`, free plan) and wires `DATABASE_URL` to it via `fromDatabase`. `JWT_ACCESS_SECRET` uses `generateValue: true` so Render generates and persists a strong secret that's never committed. The build command runs `npx prisma generate && npx prisma migrate deploy` before `npm run build`, applying committed migrations non-interactively.

**Swapping Postgres providers** (Railway, Neon, Supabase, etc.) requires zero code changes: provision the database there, copy its connection string into `DATABASE_URL`, run `npx prisma migrate deploy` against it once, and update the env var on Render. Prisma is the entire integration surface — no provider-specific code exists anywhere else.

Note: Render Postgres's *external* connection string requires `?sslmode=require`; the internal connection string Render injects via `fromDatabase` does not need it. This is a connection-string value detail, not a code branch.

---

## Future OAuth Extension Plan

1. Add an OAuth client dependency (e.g. a provider SDK, or a manual authorization-code exchange — no dependency chosen yet).
2. Add `/auth/oauth/:provider/callback` route(s).
3. On callback, upsert into `Identity` (keyed on `(provider, providerAccountId)`) and `User` (create if no matching `Identity`/email).
4. Issue the same access token + refresh cookie as the email/password flow — everything downstream (socket auth, campaign progress, `requireAuth`) is provider-agnostic already.

No schema migration is required for this — see "OAuth Extension Path" above.
