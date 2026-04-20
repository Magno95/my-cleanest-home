# @mch/db

Supabase schema, migrations, and generated types for My Cleanest Home.

## Local workflow

```bash
# Start the Supabase stack (requires colima/Docker running)
pnpm --filter @mch/db db:start

# Apply migrations + seed
pnpm --filter @mch/db db:reset

# Regenerate TypeScript types from the running local DB
pnpm --filter @mch/db gen:types
```

## Layout

- `supabase/config.toml` — Supabase CLI config.
- `supabase/migrations/` — SQL migrations. Do **not** edit past migrations; add a new file.
- `src/types.generated.ts` — produced by `gen:types`. Stubbed in git; overwritten by the CLI.
- `src/index.ts` — re-exports `Database` from the generated file.

## Adding a table

1. Create a new migration: `supabase migration new <name>` (or hand-write the file).
2. Add RLS policies in the same migration. Home-scoped tables derive access from `home_members`.
3. `pnpm --filter @mch/db db:reset` to apply.
4. `pnpm --filter @mch/db gen:types` and commit the updated `types.generated.ts`.
