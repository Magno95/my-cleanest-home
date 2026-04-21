# Home Join Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable home join codes, let authenticated users join a home from the profile page with that code, and make the joined home active immediately.

**Architecture:** Extend the Supabase schema with a unique `join_code` on `homes`, keep owner membership creation in the existing trigger, and add a `join_home_by_code` RPC for atomic membership + active-home updates. On the frontend, extend home queries to include `joinCode`, add a dedicated join-home mutation hook, and update the profile page to expose the code and a two-tab create/join panel.

**Tech Stack:** Supabase Postgres migrations and RPCs, generated Supabase TypeScript types, React, TanStack Query, React Hook Form, Zod, Vitest

---

## File map

### Database

- Create: `packages/db/supabase/migrations/20260421000008_home_join_codes.sql`
  - adds `homes.join_code`
  - backfills existing homes
  - updates `public.create_home(text)`
  - adds `public.join_home_by_code(text)`
  - grants execute permissions
- Modify (generated): `packages/db/src/types.generated.ts`
  - reflects `homes.join_code`
  - adds `join_home_by_code` to `Functions`

### Frontend data layer

- Modify: `apps/web/src/features/homes/use-homes.ts`
  - add `joinCode` to `HomeSummary`
  - select `join_code` in list queries
- Modify: `apps/web/src/features/homes/use-home.ts`
  - select `join_code` in detail query
- Create: `apps/web/src/features/homes/use-join-home-by-code.ts`
  - mutation hook for `supabase.rpc('join_home_by_code', { code })`
  - invalidates `homes` and `profile`
- Create: `apps/web/src/features/homes/use-join-home-by-code.test.ts`
  - tests hook mutation function behavior

### Frontend UI

- Modify: `apps/web/src/routes/profile-page.tsx`
  - render visible home code block + copy action
  - replace single create form with two-tab create/join panel
  - wire join flow to the new mutation hook
- Create: `apps/web/src/features/homes/home-code-display.tsx`
  - focused presentational component for the visible code and copy button
- Create: `apps/web/src/features/homes/home-code-display.test.tsx`
  - verifies join code text renders in markup

### Existing tests to keep green

- Keep passing: `apps/web/src/features/homes/use-create-home.test.ts`
- Keep passing: `apps/web/src/features/bootstrap/use-first-run-bootstrap.test.ts`

## Task 1: Add the database join-code schema and RPCs

**Files:**

- Create: `packages/db/supabase/migrations/20260421000008_home_join_codes.sql`

- [ ] **Step 1: Run a failing pre-check against the local database**

Run:

```bash
docker exec supabase_db_my-cleanest-home \
  psql -U postgres -d postgres \
  -c "select join_code from public.homes limit 1;"
```

Expected: FAIL with an error like `column "join_code" does not exist`

- [ ] **Step 2: Run a failing RPC pre-check**

Run:

```bash
docker exec supabase_db_my-cleanest-home \
  psql -U postgres -d postgres \
  -c "select public.join_home_by_code('MCH-AAAAAA');"
```

Expected: FAIL with an error like `function public.join_home_by_code(unknown) does not exist`

- [ ] **Step 3: Write the migration**

Create `packages/db/supabase/migrations/20260421000008_home_join_codes.sql` with the following core structure:

```sql
alter table public.homes
  add column join_code text;

create or replace function public.generate_home_join_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text := 'MCH-';
begin
  for i in 1..6 loop
    candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return candidate;
end;
$$;

do $$
declare
  home_row record;
  candidate text;
begin
  for home_row in select id from public.homes where join_code is null loop
    loop
      candidate := public.generate_home_join_code();
      begin
        update public.homes
        set join_code = candidate
        where id = home_row.id and join_code is null;
        exit;
      exception
        when unique_violation then
          null;
      end;
    end loop;
  end loop;
end $$;

alter table public.homes
  alter column join_code set not null;

create unique index homes_join_code_key on public.homes(join_code);

create or replace function public.create_home(name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_name text;
  new_home_id uuid;
  candidate_code text;
begin
  trimmed_name := trim(name);
  if trimmed_name is null or trimmed_name = '' then
    raise exception 'Home name cannot be empty';
  end if;

  loop
    candidate_code := public.generate_home_join_code();
    begin
      insert into public.homes (name, join_code)
      values (trimmed_name, candidate_code)
      returning id into new_home_id;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return new_home_id;
end;
$$;

create or replace function public.join_home_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
  target_home_id uuid;
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Must be authenticated';
  end if;

  normalized_code := upper(trim(code));
  if normalized_code is null or normalized_code = '' then
    raise exception 'Home code is required';
  end if;

  select id
    into target_home_id
    from public.homes
   where join_code = normalized_code;

  if target_home_id is null then
    raise exception 'Home code not found';
  end if;

  insert into public.home_members (home_id, user_id, role)
  values (target_home_id, current_user_id, 'member')
  on conflict (home_id, user_id) do nothing;

  insert into public.user_profiles (user_id, active_home_id)
  values (current_user_id, target_home_id)
  on conflict (user_id) do update
    set active_home_id = excluded.active_home_id;

  return target_home_id;
end;
$$;

grant execute on function public.join_home_by_code(text) to authenticated;
```

- [ ] **Step 4: Apply the migration on the local database**

Run:

```bash
pnpm --filter @mch/db db:reset
```

Expected: local Supabase reset completes and reapplies all migrations including `20260421000008_home_join_codes.sql`

- [ ] **Step 5: Verify the schema and RPC exist**

Run:

```bash
docker exec supabase_db_my-cleanest-home \
  psql -U postgres -d postgres \
  -c "\d public.homes"

docker exec supabase_db_my-cleanest-home \
  psql -U postgres -d postgres \
  -c "select proname from pg_proc where proname = 'join_home_by_code';"
```

Expected:

- `public.homes` output includes `join_code`
- second command returns one row with `join_home_by_code`

- [ ] **Step 6: Commit the migration**

Run:

```bash
git add packages/db/supabase/migrations/20260421000008_home_join_codes.sql
git commit -m "feat(db): add home join codes"
```

## Task 2: Regenerate database types and extend home query shapes

**Files:**

- Modify: `packages/db/src/types.generated.ts`
- Modify: `apps/web/src/features/homes/use-homes.ts`
- Modify: `apps/web/src/features/homes/use-home.ts`
- Test: `apps/web/src/features/homes/use-create-home.test.ts`

- [ ] **Step 1: Write a failing frontend assertion for the new home shape**

Add this test case to `apps/web/src/features/homes/use-create-home.test.ts` temporarily as the failing red step for the new RPC type expectation:

```ts
it('returns the created home id from createHomeRecord', async () => {
  vi.mocked(supabase.rpc).mockResolvedValue({ data: 'home-123', error: null });

  await expect(createHomeRecord({ name: 'Apartment' })).resolves.toBe('home-123');
  expect(supabase.rpc).toHaveBeenCalledWith('create_home', { name: 'Apartment' });
});
```

Expected: FAIL until `createHomeRecord` is exported where needed and the imports are updated

- [ ] **Step 2: Regenerate Supabase types**

Run:

```bash
pnpm --filter @mch/db gen:types
```

Expected: `packages/db/src/types.generated.ts` now includes:

```ts
homes: {
  Row: {
    created_at: string;
    id: string;
    join_code: string;
    name: string;
    updated_at: string;
  }
}

Functions: {
  create_home: {
    Args: {
      name: string;
    }
    Returns: string;
  }
  join_home_by_code: {
    Args: {
      code: string;
    }
    Returns: string;
  }
}
```

- [ ] **Step 3: Update the home list query shape**

Modify `apps/web/src/features/homes/use-homes.ts` to match this shape:

```ts
export interface HomeSummary {
  id: string;
  name: string;
  createdAt: string;
  joinCode: string;
}

async function fetchHomes(): Promise<HomeSummary[]> {
  const { data, error } = await supabase
    .from('homes')
    .select('id, name, join_code, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    joinCode: row.join_code,
  }));
}
```

- [ ] **Step 4: Update the home detail query shape**

Modify `apps/web/src/features/homes/use-home.ts`:

```ts
const { data, error } = await supabase
  .from('homes')
  .select('id, name, join_code, created_at')
  .eq('id', id)
  .single();

return {
  id: data.id,
  name: data.name,
  createdAt: data.created_at,
  joinCode: data.join_code,
};
```

- [ ] **Step 5: Run targeted tests and typecheck**

Run:

```bash
pnpm --filter @mch/web test src/features/homes/use-create-home.test.ts
pnpm --filter @mch/web typecheck
```

Expected:

- test file passes
- web typecheck passes with `joinCode` propagated

- [ ] **Step 6: Commit the query-shape updates**

Run:

```bash
git add packages/db/src/types.generated.ts apps/web/src/features/homes/use-homes.ts apps/web/src/features/homes/use-home.ts apps/web/src/features/homes/use-create-home.test.ts
git commit -m "feat(web): include join codes in home queries"
```

## Task 3: Add the join-home mutation hook

**Files:**

- Create: `apps/web/src/features/homes/use-join-home-by-code.ts`
- Create: `apps/web/src/features/homes/use-join-home-by-code.test.ts`
- Modify: `apps/web/src/lib/query-keys.ts`

- [ ] **Step 1: Write the failing test for the mutation function**

Create `apps/web/src/features/homes/use-join-home-by-code.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { joinHomeByCode } from './use-join-home-by-code';

vi.mock('../../lib/supabase.js', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '../../lib/supabase.js';

describe('joinHomeByCode', () => {
  it('calls the join_home_by_code RPC with the entered code', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'home-123', error: null });

    await expect(joinHomeByCode({ code: 'MCH-7K4P9Q' })).resolves.toBe('home-123');

    expect(supabase.rpc).toHaveBeenCalledWith('join_home_by_code', {
      code: 'MCH-7K4P9Q',
    });
  });
});
```

Run:

```bash
pnpm --filter @mch/web test src/features/homes/use-join-home-by-code.test.ts
```

Expected: FAIL with module/function-not-found errors

- [ ] **Step 2: Implement the mutation file**

Create `apps/web/src/features/homes/use-join-home-by-code.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

interface JoinHomeByCodeInput {
  code: string;
}

export async function joinHomeByCode({ code }: JoinHomeByCodeInput): Promise<string> {
  const normalizedCode = code.trim().toUpperCase();
  const { data, error } = await supabase.rpc('join_home_by_code', { code: normalizedCode });
  if (error) throw error;
  return data;
}

export function useJoinHomeByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinHomeByCode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.mine() });
    },
  });
}
```

- [ ] **Step 3: Run the mutation test**

Run:

```bash
pnpm --filter @mch/web test src/features/homes/use-join-home-by-code.test.ts
```

Expected: PASS

- [ ] **Step 4: Confirm query key coverage stays sufficient**

No new key factory is required. Keep using:

```ts
queryKeys.homes.all;
queryKeys.profile.mine();
```

Run:

```bash
pnpm --filter @mch/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit the mutation hook**

Run:

```bash
git add apps/web/src/features/homes/use-join-home-by-code.ts apps/web/src/features/homes/use-join-home-by-code.test.ts
git commit -m "feat(web): add join-home mutation"
```

## Task 4: Add a focused home-code display component

**Files:**

- Create: `apps/web/src/features/homes/home-code-display.tsx`
- Create: `apps/web/src/features/homes/home-code-display.test.tsx`

- [ ] **Step 1: Write the failing render test**

Create `apps/web/src/features/homes/home-code-display.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeCodeDisplay } from './home-code-display';

describe('HomeCodeDisplay', () => {
  it('renders the join code label and value', () => {
    const html = renderToStaticMarkup(<HomeCodeDisplay code="MCH-7K4P9Q" onCopy={() => {}} />);

    expect(html).toContain('Home code');
    expect(html).toContain('MCH-7K4P9Q');
    expect(html).toContain('Copy code');
  });
});
```

Run:

```bash
pnpm --filter @mch/web test src/features/homes/home-code-display.test.tsx
```

Expected: FAIL with module-not-found

- [ ] **Step 2: Implement the presentational component**

Create `apps/web/src/features/homes/home-code-display.tsx`:

```tsx
import { Button } from '@mch/ui';

interface HomeCodeDisplayProps {
  code: string;
  onCopy: () => void;
}

export function HomeCodeDisplay({ code, onCopy }: HomeCodeDisplayProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
        Home code
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <code className="text-sm font-semibold tracking-[0.2em] text-foreground">{code}</code>
        <Button type="button" size="sm" variant="outline" onClick={onCopy}>
          Copy code
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the component test**

Run:

```bash
pnpm --filter @mch/web test src/features/homes/home-code-display.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit the component**

Run:

```bash
git add apps/web/src/features/homes/home-code-display.tsx apps/web/src/features/homes/home-code-display.test.tsx
git commit -m "feat(web): add home code display component"
```

## Task 5: Update the profile page for create/join tabs and code sharing

**Files:**

- Modify: `apps/web/src/routes/profile-page.tsx`
- Modify: `apps/web/src/features/active-home/use-active-home.ts`
- Test: `apps/web/src/features/homes/use-create-home.test.ts`
- Test: `apps/web/src/features/homes/use-join-home-by-code.test.ts`
- Test: `apps/web/src/features/homes/home-code-display.test.tsx`

- [ ] **Step 1: Add form schemas for both tabs**

In `apps/web/src/routes/profile-page.tsx`, define:

```ts
const joinHomeSchema = z.object({
  code: z.string().trim().min(1, 'Home code is required'),
});

type JoinHomeValues = z.infer<typeof joinHomeSchema>;
```

Add tab state:

```ts
const [panelMode, setPanelMode] = useState<'create' | 'join'>('create');
```

- [ ] **Step 2: Render the home code on every card**

Import and use the new display component:

```tsx
import { HomeCodeDisplay } from '../features/homes/home-code-display.js';
```

Inside `HomeRow`:

```tsx
const handleCopyCode = async () => {
  await navigator.clipboard.writeText(home.joinCode);
  toast.success('Home code copied');
};

<HomeCodeDisplay code={home.joinCode} onCopy={() => void handleCopyCode()} />;
```

- [ ] **Step 3: Replace the single create form with a two-tab panel**

Reshape the add-home area to:

```tsx
{showCreate ? (
  <Card>
    <CardHeader>
      <CardTitle>Add a home</CardTitle>
      <CardDescription>Create a new home or join one with a code.</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={panelMode === 'create' ? 'brand' : 'outline'}
          onClick={() => setPanelMode('create')}
        >
          Create new
        </Button>
        <Button
          type="button"
          variant={panelMode === 'join' ? 'brand' : 'outline'}
          onClick={() => setPanelMode('join')}
        >
          Join with code
        </Button>
      </div>
      {panelMode === 'create' ? <CreateHomeForm onDone={...} /> : <JoinHomeForm onDone={...} />}
    </CardContent>
  </Card>
) : null}
```

- [ ] **Step 4: Implement `JoinHomeForm`**

Add a sibling form component in `profile-page.tsx`:

```tsx
function JoinHomeForm({ onDone }: { onDone: () => void }) {
  const joinHome = useJoinHomeByCode();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JoinHomeValues>({
    resolver: zodResolver(joinHomeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await joinHome.mutateAsync(values);
      toast.success('Joined home successfully');
      reset();
      onDone();
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('Home code not found')
          ? 'Home code not found'
          : 'Failed to join home';
      toast.error(message);
    }
  });

  const busy = joinHome.isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Field id="home-code-profile" label="Home code" error={errors.code?.message}>
        <Input
          id="home-code-profile"
          placeholder="e.g. MCH-7K4P9Q"
          autoFocus
          aria-invalid={errors.code ? 'true' : 'false'}
          {...register('code')}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={busy}>
          {busy ? 'Joining…' : 'Join home'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Ensure the active-home hook naturally reflects the joined home**

No new hook logic should be required because `useActiveHome` already derives from:

```ts
const activeId = profile.data?.activeHomeId ?? null;
const list = homes.data ?? [];
```

After the join mutation invalidates `homes` and `profile`, the hook should pick up the joined active home automatically.

Run:

```bash
pnpm --filter @mch/web typecheck
```

Expected: PASS

- [ ] **Step 6: Run focused frontend tests**

Run:

```bash
pnpm --filter @mch/web test \
  src/features/homes/use-create-home.test.ts \
  src/features/homes/use-join-home-by-code.test.ts \
  src/features/homes/home-code-display.test.tsx \
  src/features/bootstrap/use-first-run-bootstrap.test.ts
```

Expected: all listed tests PASS

- [ ] **Step 7: Commit the profile UI changes**

Run:

```bash
git add apps/web/src/routes/profile-page.tsx apps/web/src/features/active-home/use-active-home.ts
git add apps/web/src/features/homes/home-code-display.tsx apps/web/src/features/homes/home-code-display.test.tsx
git add apps/web/src/features/homes/use-join-home-by-code.ts apps/web/src/features/homes/use-join-home-by-code.test.ts
git commit -m "feat(web): add profile home join flow"
```

## Task 6: Run full verification and prepare deployment handoff

**Files:**

- Modify: none
- Verify: repository state and generated files only

- [ ] **Step 1: Run repository lint**

Run:

```bash
pnpm lint
```

Expected: completes successfully; existing warnings may remain if they were already present, but no new errors are introduced

- [ ] **Step 2: Run repository typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 3: Run repository tests**

Run:

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git --no-pager diff --stat HEAD~4..HEAD
git --no-pager status --short
```

Expected:

- only the planned DB/frontend files are changed
- no accidental edits under `.superpowers/`

- [ ] **Step 5: Commit any final generated-file adjustments**

Run:

```bash
git add packages/db/src/types.generated.ts
git commit -m "chore: refresh generated types for home join codes"
```

Only run this step if the generated types changed after the last feature commit and are not already included.

- [ ] **Step 6: Deployment handoff notes**

Record these execution notes in the final handoff:

```text
1. Run the new migration remotely before deploying the updated frontend.
2. If local Supabase has stale functions, use pnpm --filter @mch/db db:reset.
3. The join flow depends on homes.join_code and public.join_home_by_code(text).
```

## Self-review

### Spec coverage

- stable visible code on home cards: covered by Task 4 and Task 5
- join by code from the profile page: covered by Task 3 and Task 5
- joined home becomes active: covered by Task 1 RPC behavior and Task 5 invalidation behavior
- duplicate memberships prevented: covered by Task 1 `on conflict do nothing`
- create-home flow preserved: covered by Task 2 targeted test and Task 5 focused test run

### Placeholder scan

- no `TODO`, `TBD`, or “similar to previous task” references remain
- every code-changing step includes code or exact command content

### Type consistency

- database field name: `join_code`
- frontend property name: `joinCode`
- RPC name: `join_home_by_code`
- mutation function name: `joinHomeByCode`
