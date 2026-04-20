# Home Creation RPC Design

## Problem

Creating a home currently fails under Row-Level Security because the frontend inserts into `public.homes` and immediately requests a selected row back with:

```ts
supabase.from('homes').insert({ name }).select('id').single();
```

The insert policy on `public.homes` allows creation, but the select policy only allows reads for current home members. Ownership membership is added afterward by an `after insert` trigger, so the post-insert read can fail before the new membership is visible to the read path.

## Proposed Approach

Add a database entrypoint `public.create_home(name text)` and update the frontend to call it through `supabase.rpc(...)`.

The function will:

1. Require an authenticated caller.
2. Validate and normalize the incoming home name.
3. Insert a new row into `public.homes`.
4. Insert the caller into `public.home_members` as `owner`.
5. Return the new home id.

This moves the privileged, multi-table write into a single atomic database operation and avoids the current race between insert, trigger, and read policies.

## Alternatives Considered

### 1. Relax `homes` RLS policies

Allow newly inserted homes to be readable through broader select logic.

**Rejected:** It weakens the policy model and still depends on subtle timing/order assumptions around insert and membership creation.

### 2. Keep direct inserts and stop selecting immediately

Change the client to avoid `.select().single()` after insert.

**Rejected:** It leaves home creation split between client behavior, triggers, and follow-up reads. It is more fragile and less explicit than a dedicated RPC.

### 3. RPC-based home creation

Use a security-definer function for the atomic create-and-assign-owner flow.

**Selected:** It is the clearest and most robust fix for this RLS boundary.

## Database Design

Create a new migration under `packages/db/supabase/migrations/` that adds:

### Function: `public.create_home(name text)`

Behavior:

- Reject unauthenticated callers with an explicit exception.
- Trim the input name.
- Reject empty names.
- Enforce the same length constraints as the `homes.name` column.
- Insert into `public.homes`.
- Insert the owner membership into `public.home_members`.
- Return the created home id.

Implementation notes:

- Use `security definer`.
- Set `search_path = public`.
- Capture `auth.uid()` once into a local variable.
- Keep the existing `homes` table and `home_members` table intact.

### Privileges

- Grant execute on `public.create_home(text)` to `authenticated`.

### Existing trigger and policies

- Keep existing read/update/delete policies on `public.homes`.
- Keep the existing owner-membership trigger unless it becomes redundant enough to remove safely in the same migration.
- Do not broaden read access on `public.homes`.

The migration should prefer minimum blast radius: introduce the explicit RPC path first, then remove redundant trigger behavior only if the final design stays fully correct and simpler.

## Frontend Design

Update `apps/web/src/features/homes/use-create-home.ts` to:

1. Call `supabase.rpc('create_home', { name })`.
2. Read the returned home id from the RPC response.
3. Continue calling `ensureMiscellaneousRoom(homeId)` with that id.

The mutation contract can stay the same for the rest of the UI: “create home, then create default room, then invalidate home queries.”

## Error Handling

Database-side errors should be explicit and user-safe:

- Unauthenticated caller -> explicit database exception.
- Blank name -> explicit database exception.
- Overlong name -> explicit database exception or column constraint violation, depending on implementation detail.

Frontend behavior remains unchanged in shape:

- Throw Supabase errors from the mutation.
- Show the existing toast error in the create-home form.

## Validation Plan

After implementation:

1. Apply the new migration locally.
2. Verify a signed-in user can create a home successfully.
3. Verify the creator becomes an owner in `public.home_members`.
4. Verify the new home is immediately visible in `useHomes`.
5. Verify `ensureMiscellaneousRoom(homeId)` still succeeds.
6. Verify the active-home/profile flow still works with the created home.
7. Push the migration to the remote Supabase project before relying on the deployed frontend.

## Scope

In scope:

- New SQL migration for `create_home`.
- Frontend update to use RPC instead of direct `homes` insert.
- Validation of the create-home flow under RLS.

Out of scope:

- Broader RLS redesign for other entities.
- Auth flow redesign.
- Non-home creation refactors.
