# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Run all tests (Vitest, Node env)
npx vitest run lib/scoring.test.ts   # Run a single test file
```

## Architecture

Multi-tenant World Cup 2026 prediction platform ("prode") for corporate clients. Each company gets an isolated namespace at `/c/[slug]` with its own branding, users, and predictions.

### Two parallel systems

**Corporate system** (`app/c/[slug]/`, `lib/corporate/`, `components/corporate/`):
- The primary product. Companies ("clients") each have a slug, branding config, game mode, and isolated user + prediction data.
- Two game modes: `simple` (one full fixture submitted before the tournament) and `interactive` (per-match predictions throughout).
- Client config is fetched by `getCorporateClient(slug)` with 5-min revalidation and passed down via props — there is no context or store.

**Legacy public system** (`app/grupos/`, `app/ligas/`, `lib/group-*.ts`, `lib/admin-*.ts`):
- Older public pools unrelated to the corporate tenant system. Mostly separate routes and lib files.

### Database

Raw SQL via the `postgres` npm package — no ORM. Tagged template literals everywhere:

```ts
const rows = await sql`SELECT * FROM companies WHERE slug = ${slug}`;
```

Connection is initialized in `lib/db.ts` from `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` (tried in order). Schema is auto-ensured in dev; in prod it's controlled by `RUNTIME_DB_SCHEMA_ENSURE`.

All corporate data (users, predictions, results) is scoped to `company_id`. Never query across tenants.

### Auth — three independent session systems

| System | Cookie | Scope | Mechanism |
|---|---|---|---|
| Participant | `pep-session` | Global path `/` | HMAC-SHA256 signed `{companyId, userId}`, 30-day |
| Company operator | `fwc26-corp-admin-{slug}` | `/c/{slug}/admin` | Presence-only cookie, 8h |
| Global admin | `fwc26-admin-session` | `/admin` | SHA256 hash of `ADMIN_PASSWORD` env var |

Participant sessions are validated and decoded in `lib/corporate/session.ts`. Operator sessions have no token — just cookie existence.

### Prediction data model

`FixtureState` is the core type (`lib/world-cup-types.ts`). It holds:
- `groupOrders` — ranked teams per group
- `groupMatchPredictions` — home/draw/away per group match
- `knockoutWinners` — advancing team per knockout match ID
- `qualifiedThirdPlaces` + `thirdPlaceAssignments` — 3rd-place bracket

Knockout match IDs (e.g. `M101`, `M104`) are defined in `data/world-cup-2026.ts` alongside teams, groups, and match metadata. `lib/world-cup-fixture.ts` derives `DerivedMatch` objects (with resolved team info) from a `FixtureState`.

### Poster / image generation

`components/fixture-poster.tsx` renders the shareable fixture image. It is mounted client-side inside `fixture-builder.tsx` and captured via `html-to-image` (no server involvement). Company branding is injected as CSS custom properties (`--poster-primary`, `--poster-bg`, etc.) via inline style. The company logo is proxied through `/c/[slug]/assets/logo` to avoid CORS issues during canvas capture.

### Key env vars

`POSTGRES_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `RUNTIME_DB_SCHEMA_ENSURE`
