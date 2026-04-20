# AGENTS.md

## Product

Web app to manage household cleaning: map rooms/items, set cleaning frequencies, view a calendar of due tasks, mark tasks done to restart their cycle, and store cleaning notes, tools, products, and methods directly in the main frontend. Multi-home, multi-user with task assignment.

## Stack (confirmed)

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend (`apps/web`)**: React + Vite + TypeScript
- **Backend (`apps/api`)**: Express + TypeScript
- **DB / auth / storage**: Supabase (Postgres). Schema, migrations, and generated types live in `packages/db`.
- **Shared code**: `packages/shared` (types, domain logic), `packages/ui` (React components shared across `web` and future frontend surfaces if needed)
- **Testing**: Vitest (unit/integration), Playwright (e2e)
- **Language**: English for code, comments, commits, docs.

## Workspace layout

```
apps/
  web/     # end-user React app
  api/     # Express API
packages/
  shared/  # cross-cutting types & domain utils
  ui/      # shared React components
  db/      # Supabase schema, migrations, generated types
```

Rules:

- `apps/*` depend on `packages/*`, never on each other.
- Domain types (Home, Room, Item, Task, Frequency, CleaningCycle, Product, Tool, User, Assignment) belong in `packages/shared` and are imported by frontend and api.
- Supabase-generated types are re-exported from `packages/db`; do not import from `apps/api/**` or `apps/web/**` directly.

## Commands (target — add real scripts as they're implemented)

Run from repo root unless noted. All orchestration goes through Turbo.

- `pnpm install` — install all workspaces
- `pnpm dev` — run all apps in parallel (turbo)
- `pnpm --filter @mch/web dev` — run a single app
- `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`
- `pnpm test -- <pattern>` or `pnpm --filter <pkg> test <file>` — focused Vitest
- `pnpm --filter @mch/web e2e` — Playwright (requires dev server + Supabase running)

Order when validating a change: **lint → typecheck → test**. Do not skip typecheck; shared types cross package boundaries and tsc is the first to catch breaks.

## Deployment

- Frontend (`apps/web`) deploys to Netlify.
- Supabase remains the managed backend for auth, database, and storage.
- `apps/api` is not part of the production deployment until it owns real server-side responsibilities (e.g. webhooks, scheduled jobs, privileged server-only integrations, or admin workflows that should not run from the client).
- Netlify should build from the repo root and publish `apps/web/dist`.
- SPA routing requires a catch-all redirect to `index.html` for deep links.

## Supabase specifics

- Local dev expects the Supabase CLI (`supabase start`) running before `apps/api` or e2e tests.
- Schema changes go through migrations in `packages/db/supabase/migrations/`. After migrating, regenerate types (`supabase gen types typescript ...`) and commit the output; do not hand-edit generated files.
- Row-Level Security is expected for multi-home/multi-user isolation — when adding tables, add RLS policies in the same migration.
- Auth is handled by Supabase; the Express API validates Supabase JWTs rather than issuing its own sessions.

## Conventions

- TypeScript strict mode everywhere; no `any` in shared/public APIs.
- Path aliases use workspace names (`@mch/shared`, `@mch/ui`, `@mch/db`), not deep relative paths across packages.
- Cleaning-cycle logic (next due date, overdue calculation) lives in `packages/shared` so both the calendar UI and the API compute it identically.
- React components: function components + hooks only. Shared components go in `packages/ui` the moment a second app needs them.

## What to ask before scaffolding

If something below isn't in the repo yet, confirm with the user before inventing it:

- ESLint/Prettier config choice
- Component library / styling approach (Tailwind? CSS modules? shadcn/ui?)
- State/data-fetching (TanStack Query? RTK? plain fetch?)
- CI provider and deploy targets
- i18n (product description was written in Italian; UI language is not yet decided)

## Out of scope (do not add unprompted)

- Electron / native desktop packaging.
- Alternative ORMs (Prisma/Drizzle) — data access goes through Supabase clients.
- Extra apps beyond `web` and `api`.
