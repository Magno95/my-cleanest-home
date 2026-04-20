# Home Creation RPC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct `homes` inserts with a `create_home` Supabase RPC so authenticated users can create homes successfully under RLS.

**Architecture:** Add a new SQL migration that creates a `security definer` function `public.create_home(name text)` returning the new home id after inserting both `homes` and `home_members` atomically. Then regenerate Supabase types and update the frontend home-creation mutation to call the RPC and continue creating the default miscellaneous room with the returned id.

**Tech Stack:** Supabase migrations, PostgreSQL 17, Supabase generated TypeScript types, React, TanStack Query, Vitest, pnpm

---

## File Structure Map

- Create: `packages/db/supabase/migrations/20260420000007_create_home_rpc.sql` — introduces `public.create_home(name text)`, grants execute to `authenticated`, and narrows the supported write path for home creation.
- Modify: `packages/db/src/types.generated.ts` — regenerated Supabase types so the new RPC appears in `Database['public']['Functions']`.
- Modify: `apps/web/src/features/homes/use-create-home.ts` — replace direct `homes` insert with `supabase.rpc('create_home', ...)`.
- Create: `apps/web/src/features/homes/use-create-home.test.ts` — verifies the home creation helper calls the RPC contract and uses the returned id to create the default room.
- Modify: `/Users/magnonid/.copilot/session-state/4271485d-1a35-4e6b-a304-944123649780/plan.md` — note that the RLS bug now has a dedicated implementation plan in the worktree.

## Task 1: Add the database RPC for atomic home creation

**Files:**

- Create: `packages/db/supabase/migrations/20260420000007_create_home_rpc.sql`
- Review: `packages/db/supabase/migrations/20260420000000_init.sql:233-270`

- [ ] **Step 1: Write the failing reproduction as a SQL verification script**

Create `packages/db/supabase/migrations/20260420000007_create_home_rpc.sql` with this initial failing placeholder block at the top so the engineer has the intended behavior pinned down before the function exists:

```sql
-- Expected verification after this migration is applied:
-- select public.create_home('My test home');
-- Result: returns a UUID for the created home instead of a 42501 RLS error.
```

- [ ] **Step 2: Run the current local reset to prove the old behavior still exists**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home/packages/db
pnpm db:reset
```

Expected: local database resets successfully, but the app still reproduces the RLS failure when using the current direct insert path.

- [ ] **Step 3: Implement the migration**

Replace the placeholder-only file with this full migration:

```sql
create or replace function public.create_home(name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  normalized_name text := btrim(name);
  created_home_id uuid;
begin
  if current_user is null then
    raise exception 'create_home requires an authenticated user';
  end if;

  if normalized_name = '' then
    raise exception 'create_home requires a non-empty name';
  end if;

  if char_length(normalized_name) > 120 then
    raise exception 'create_home name must be 120 characters or fewer';
  end if;

  insert into public.homes (name)
  values (normalized_name)
  returning id into created_home_id;

  insert into public.home_members (home_id, user_id, role)
  values (created_home_id, current_user, 'owner')
  on conflict do nothing;

  return created_home_id;
end;
$$;

grant execute on function public.create_home(text) to authenticated;
```

- [ ] **Step 4: Apply the migration locally**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home/packages/db
pnpm db:reset
```

Expected: reset succeeds and the new function exists in the local database.

- [ ] **Step 5: Verify the function exists**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home/packages/db
supabase db dump --local --schema public --data-only=false | grep "create_home"
```

Expected: output contains `create or replace function public.create_home(name text)`.

- [ ] **Step 6: Commit the migration**

```bash
git add packages/db/supabase/migrations/20260420000007_create_home_rpc.sql
git commit -m "feat(db): add home creation rpc"
```

## Task 2: Regenerate Supabase types for the new RPC

**Files:**

- Modify: `packages/db/src/types.generated.ts`
- Review: `packages/db/package.json`

- [ ] **Step 1: Write the failing type expectation**

Before regenerating, confirm the function is currently absent from generated types:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home
rg -n "create_home" packages/db/src/types.generated.ts
```

Expected: no matches.

- [ ] **Step 2: Regenerate the local types**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home/packages/db
pnpm gen:types
```

Expected: `packages/db/src/types.generated.ts` now includes `create_home`.

- [ ] **Step 3: Verify the generated function signature**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home
rg -n "create_home" packages/db/src/types.generated.ts
```

Expected: a match under `Database['public']['Functions']` showing the new RPC.

- [ ] **Step 4: Commit the regenerated types**

```bash
git add packages/db/src/types.generated.ts
git commit -m "chore(db): regenerate types for create_home rpc"
```

## Task 3: Update the frontend to use the RPC

**Files:**

- Modify: `apps/web/src/features/homes/use-create-home.ts`
- Create: `apps/web/src/features/homes/use-create-home.test.ts`
- Review: `apps/web/src/features/rooms/miscellaneous-room.ts`

- [ ] **Step 1: Write the failing frontend test**

Create `apps/web/src/features/homes/use-create-home.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const ensureMiscellaneousRoom = vi.fn();

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    rpc,
  },
}));

vi.mock('../rooms/miscellaneous-room.js', () => ({
  ensureMiscellaneousRoom,
}));

describe('createHome', () => {
  it('creates a home through the RPC and creates the miscellaneous room', async () => {
    rpc.mockResolvedValueOnce({ data: 'home-123', error: null });

    const { createHome } = await import('./use-create-home.js');

    await createHome({ name: 'Apartment' });

    expect(rpc).toHaveBeenCalledWith('create_home', { name: 'Apartment' });
    expect(ensureMiscellaneousRoom).toHaveBeenCalledWith('home-123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home
pnpm --filter @mch/web test apps/web/src/features/homes/use-create-home.test.ts
```

Expected: FAIL because `createHome` is not exported and the current implementation still uses `from('homes').insert(...)`.

- [ ] **Step 3: Implement the minimal frontend change**

Update `apps/web/src/features/homes/use-create-home.ts` to:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { ensureMiscellaneousRoom } from '../rooms/miscellaneous-room.js';

interface CreateHomeInput {
  name: string;
}

export async function createHome({ name }: CreateHomeInput): Promise<void> {
  const { data: homeId, error } = await supabase.rpc('create_home', { name });

  if (error) throw error;
  await ensureMiscellaneousRoom(homeId);
}

export function useCreateHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHome,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.list() });
    },
  });
}
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home
pnpm --filter @mch/web test apps/web/src/features/homes/use-create-home.test.ts
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the frontend change**

```bash
git add apps/web/src/features/homes/use-create-home.ts apps/web/src/features/homes/use-create-home.test.ts
git commit -m "feat(web): create homes through rpc"
```

## Task 4: Validate the full local flow and record rollout steps

**Files:**

- Modify: `/Users/magnonid/.copilot/session-state/4271485d-1a35-4e6b-a304-944123649780/plan.md`

- [ ] **Step 1: Run the repository validation sequence**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home
pnpm lint && pnpm typecheck && pnpm test
```

Expected: all commands pass.

- [ ] **Step 2: Run the frontend build**

Run:

```bash
cd /Users/magnonid/PersonalProjects/my-cleanest-home
pnpm --filter @mch/web build
```

Expected: build succeeds.

- [ ] **Step 3: Update the session plan with rollout notes**

Append this section to `/Users/magnonid/.copilot/session-state/4271485d-1a35-4e6b-a304-944123649780/plan.md`:

```md
## Home Creation RPC Rollout

- Apply `packages/db/supabase/migrations/20260420000007_create_home_rpc.sql` locally with `pnpm db:reset`.
- Push the migration to the remote project with `supabase db push` before relying on the deployed frontend.
- After deploy, verify sign-in, home creation, owner membership, and automatic miscellaneous room creation.
```

- [ ] **Step 4: Commit the session-note checkpoint if desired**

```bash
git status --short
```

Expected: repo files are committed; only the session plan may remain outside git.

## Self-Review

- Spec coverage: the plan covers the new SQL entrypoint, regenerated types, frontend RPC adoption, and local/remote rollout validation.
- Placeholder scan: no TODO/TBD placeholders remain; every command, file path, and code snippet is explicit.
- Type consistency: the plan consistently uses `create_home` in SQL/types/frontend, and `createHome` in the React code.
