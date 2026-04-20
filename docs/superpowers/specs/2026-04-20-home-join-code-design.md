# Home join code design

## Problem

Users can create multiple homes, but they cannot currently join an existing home owned by another user. The profile page needs a simple way to share a home identifier and let another authenticated user join that home from the same screen used to create homes.

## Goals

- Show a stable, human-shareable home code on each home card in the profile page.
- Let a signed-in user join an existing home by entering that code from the profile page.
- Make the joined home the active home immediately after a successful join.
- Prevent duplicate membership rows and handle already-joined homes gracefully.
- Keep the existing create-home flow working through database RPCs.

## Non-goals

- Rotating, expiring, or owner-revokable invite codes.
- Role management beyond owner/member.
- Accepting invite codes anywhere outside the profile page.
- Email invitations or notification workflows.

## Current context

- Homes are stored in `public.homes`.
- Membership is stored in `public.home_members` with `(home_id, user_id)` as the primary key.
- The profile page in `apps/web/src/routes/profile-page.tsx` already lists homes and contains the create-home form.
- Home creation already routes through the `public.create_home(text)` RPC and the `homes_create_owner_membership` trigger creates the owner membership row.
- The current UI has no notion of a shareable home code or join flow.

## Proposed approach

Add a stable `join_code` column to `public.homes`, generate it in the database at home creation time, expose it in home queries, and add a new `public.join_home_by_code(text)` RPC. Update the profile page so each home card displays the code and the add-home panel offers two tabs: create a new home or join an existing home with a code.

This keeps the feature compact:

- home ownership remains derived from `home_members`
- joining a home is handled atomically in the database
- the frontend only needs to call one mutation for each flow

## Data model

### `public.homes`

Add:

- `join_code text not null unique`

Constraints and format:

- generated for every home at insert time
- stable for the life of the home
- short enough to share manually
- uppercase and formatted for readability, e.g. `MCH-7K4P9Q`

Implementation details:

- add a helper function that generates candidate codes
- set `join_code` during insert, inside the home-creation RPC
- retry on unique conflicts if a generated code collides

The code should be unique globally, not just per user.

## Database behavior

### Create home

`public.create_home(name text)` remains the entry point for home creation.

Updated behavior:

1. validate the name as it does today
2. generate a unique `join_code`
3. insert the new home row with `name` and `join_code`
4. return the new home id

The existing `homes_create_owner_membership` trigger remains responsible for inserting the owner membership row. The RPC must not insert into `home_members` directly.

### Join home

Add a new RPC:

- `public.join_home_by_code(code text) returns uuid`

Behavior:

1. require an authenticated user
2. normalize the incoming code with `trim` and uppercase
3. find the matching home by `join_code`
4. fail with a clear exception if no home matches
5. insert the membership row with role `member` when the user is not already a member
6. if the user is already a member, do not insert a duplicate row
7. upsert or update `public.user_profiles.active_home_id` to the matched home id
8. return the joined home id

Duplicate membership handling:

- use `on conflict do nothing` on `(home_id, user_id)`
- treat “already a member” as a successful join from a user-experience perspective

### RLS and grants

The RPC runs as `security definer`, same as `create_home`.

Required updates:

- grant execute on `public.join_home_by_code(text)` to `authenticated`
- keep `user_profiles` update behavior compatible with the RPC updating `active_home_id`

## Frontend design

### Profile page

The profile page remains the feature entry point.

#### Home cards

Each home card shows:

- home name
- created date
- active badge if applicable
- visible home code block
- copy-code action
- existing actions such as switch/open/manage rooms

The code is always visible, not hidden behind a modal or extra click.

#### Add-home panel

Replace the current single-purpose create-home panel with one panel containing two tabs:

1. `Create new`
2. `Join with code`

Tab behavior:

- `Create new` keeps the existing name input and create action
- `Join with code` shows a single home-code input and submit action
- switching tabs preserves a lightweight, focused layout rather than stacking both forms at once

### Join flow UX

Successful join:

- show a success toast
- invalidate homes and profile queries
- set the joined home as active immediately through the RPC side effect
- collapse or reset the add-home panel

Failure states:

- invalid code: show a specific message such as “Home code not found”
- generic backend failure: show a generic fallback toast
- already a member: show a success-style message such as “You already have access to this home” or treat it as a normal success

### Query shape updates

Home list and single-home queries should include `join_code` so the profile page can render the code without extra requests.

This requires updating:

- home summary types
- `useHomes`
- any other shared home fetchers that rely on the old select list

## Components and hooks

### New or updated frontend pieces

- update `HomeSummary` to include `joinCode`
- update the home list query mapping
- extract or add a join-home mutation hook, e.g. `use-join-home-by-code.ts`
- extend the profile page form state to switch between create/join modes
- add copy-to-clipboard behavior for the visible home code

The create-home mutation can stay separate from the join-home mutation. They solve different actions and should remain independently testable.

## Validation and normalization

### Home code input

Frontend:

- trim whitespace
- optionally uppercase before submit
- require non-empty input

Backend:

- trim and uppercase again regardless of frontend behavior
- use backend normalization as the source of truth

### Security expectations

This feature is intentionally based on knowledge of a stable code. Anyone with the code can join the home once authenticated. That is acceptable for this phase of the product.

## Error handling

Database exceptions should be explicit enough that the frontend can map them to user-facing errors:

- invalid code
- unauthenticated request

The frontend should not swallow these errors silently. It should surface a clear toast and leave the panel open so the user can correct the input.

## Testing strategy

### Database

Add migration-backed verification for:

- home creation writes a unique `join_code`
- `join_home_by_code` adds a membership row for a non-member
- `join_home_by_code` does not create duplicates for an existing member
- `join_home_by_code` updates `user_profiles.active_home_id`

### Frontend

Add tests for:

- create-home flow still uses the create-home RPC
- join-home mutation calls the join RPC with the entered code
- profile page home-card mapping includes and renders `joinCode`
- join success invalidates the expected queries and reflects the new active home on the next fetch

## Rollout and migration notes

- add a new migration instead of editing already-applied migrations
- backfill `join_code` for existing homes as part of the migration
- regenerate Supabase types after the schema change
- deploy schema changes before relying on the updated frontend against remote environments

## Open decisions resolved in this design

- the code is stable, not rotatable
- the code is always visible on the home card
- joining a home immediately makes it the active home
- create and join live in the same profile panel, separated by tabs

## Implementation boundaries

This work fits in one implementation plan because it is a single feature slice spanning:

- one schema extension
- one new RPC
- small query-shape updates
- one profile-page UI enhancement

No broader invite-management system is included.
