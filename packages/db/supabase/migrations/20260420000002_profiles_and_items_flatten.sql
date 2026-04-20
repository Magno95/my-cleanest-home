-- User-facing schema pivot:
--   * user_profiles stores the "active home" per user, syncing across devices.
--   * items flatten from (area -> room -> home) to (home + optional room).
--     areas remain in the schema for legacy compatibility but are no
--     longer surfaced in the app UI.
--
-- All item-related RLS is simplified to check `items.home_id` directly via
-- is_home_member(), which keeps policies cheap and removes the 3-way joins.

-------------------------------------------------------------------------------
-- user_profiles
-------------------------------------------------------------------------------

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_home_id uuid references public.homes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

create policy "user_profiles: self read" on public.user_profiles
  for select to authenticated using (user_id = auth.uid());

create policy "user_profiles: self insert" on public.user_profiles
  for insert to authenticated with check (user_id = auth.uid());

create policy "user_profiles: self update" on public.user_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- active_home_id must be a home the user is a member of. Enforced in a
-- trigger because RLS USING/CHECK can't express cross-row constraints cleanly.
create or replace function public.check_user_profile_active_home()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active_home_id is not null
     and not public.is_home_member(new.active_home_id) then
    raise exception
      'active_home_id % is not a home the user is a member of',
      new.active_home_id;
  end if;
  return new;
end;
$$;

create trigger user_profiles_check_active_home
  before insert or update of active_home_id on public.user_profiles
  for each row execute function public.check_user_profile_active_home();

-------------------------------------------------------------------------------
-- items flatten
-------------------------------------------------------------------------------

alter table public.items
  add column home_id uuid references public.homes(id) on delete cascade,
  add column room_id uuid references public.rooms(id) on delete set null;

-- Backfill any pre-existing rows (no-op on a fresh dev DB, but keeps the
-- migration safe if someone ran the seed before).
update public.items as it
set home_id = r.home_id,
    room_id = r.id
from public.areas a
join public.rooms r on r.id = a.room_id
where it.area_id = a.id
  and it.home_id is null;

alter table public.items
  alter column home_id set not null,
  alter column area_id drop not null;

create index items_home_id_idx on public.items(home_id);
create index items_room_id_idx on public.items(room_id);

-------------------------------------------------------------------------------
-- items RLS: direct home_id check
-------------------------------------------------------------------------------

drop policy "items: members read" on public.items;
drop policy "items: members write" on public.items;

create policy "items: members read" on public.items
  for select to authenticated using (public.is_home_member(home_id));

create policy "items: members write" on public.items
  for all to authenticated
  using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-------------------------------------------------------------------------------
-- cleaning_cycles / tasks RLS: go through items.home_id (not area/room)
-------------------------------------------------------------------------------

drop policy "cleaning_cycles: members read" on public.cleaning_cycles;
drop policy "cleaning_cycles: members write" on public.cleaning_cycles;

create policy "cleaning_cycles: members read" on public.cleaning_cycles
  for select to authenticated using (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_home_member(i.home_id)
    )
  );

create policy "cleaning_cycles: members write" on public.cleaning_cycles
  for all to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_home_member(i.home_id)
    )
  )
  with check (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_home_member(i.home_id)
    )
  );

drop policy "tasks: members read" on public.tasks;
drop policy "tasks: members write" on public.tasks;

create policy "tasks: members read" on public.tasks
  for select to authenticated using (
    exists (
      select 1
      from public.cleaning_cycles c
      join public.items i on i.id = c.item_id
      where c.id = cycle_id and public.is_home_member(i.home_id)
    )
  );

create policy "tasks: members write" on public.tasks
  for all to authenticated
  using (
    exists (
      select 1
      from public.cleaning_cycles c
      join public.items i on i.id = c.item_id
      where c.id = cycle_id and public.is_home_member(i.home_id)
    )
  )
  with check (
    exists (
      select 1
      from public.cleaning_cycles c
      join public.items i on i.id = c.item_id
      where c.id = cycle_id and public.is_home_member(i.home_id)
    )
  );
