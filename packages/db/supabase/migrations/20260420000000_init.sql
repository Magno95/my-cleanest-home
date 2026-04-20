-- Initial schema for My Cleanest Home.
--
-- Conventions:
--   * UUID primary keys via gen_random_uuid().
--   * created_at/updated_at timestamps on every "entity" table.
--   * Row-Level Security is ON for every home-scoped table. Access is derived
--     from membership in home_members.
--   * Catalogue tables (products, tools, instructions) are readable by any
--     authenticated user. Write policies are intentionally NOT added here;
--     the CMS will run under the service role until an admin role is modelled.

set check_function_bodies = off;

create extension if not exists "pgcrypto";

------------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------------

create type home_role as enum ('owner', 'member');
create type frequency_unit as enum ('day', 'week', 'month', 'year');
create type task_status as enum ('pending', 'done', 'skipped');

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

-- Returns the current authenticated user's id, or null outside an auth context.
create or replace function public.current_user_id() returns uuid
language sql stable as $$
  select auth.uid();
$$;

-- Returns true when the current user is a member of the given home.
create or replace function public.is_home_member(target_home_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.home_members hm
    where hm.home_id = target_home_id
      and hm.user_id = auth.uid()
  );
$$;

-- Returns true when the current user owns the given home.
create or replace function public.is_home_owner(target_home_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.home_members hm
    where hm.home_id = target_home_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;

------------------------------------------------------------------------------
-- Homes + membership
------------------------------------------------------------------------------

create table public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.home_members (
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role home_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (home_id, user_id)
);

create index home_members_user_id_idx on public.home_members(user_id);

------------------------------------------------------------------------------
-- Rooms -> Areas -> Items
------------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rooms_home_id_idx on public.rooms(home_id);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index areas_room_id_idx on public.areas(room_id);

------------------------------------------------------------------------------
-- Catalogue (managed centrally by the CMS)
------------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  brand text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.instructions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.instruction_products (
  instruction_id uuid not null references public.instructions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (instruction_id, product_id)
);

create table public.instruction_tools (
  instruction_id uuid not null references public.instructions(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete cascade,
  primary key (instruction_id, tool_id)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  instruction_id uuid references public.instructions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_area_id_idx on public.items(area_id);
create index items_instruction_id_idx on public.items(instruction_id);

------------------------------------------------------------------------------
-- Cleaning cycles & tasks
------------------------------------------------------------------------------

create table public.cleaning_cycles (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.items(id) on delete cascade,
  frequency_unit frequency_unit not null,
  frequency_value integer not null check (frequency_value > 0),
  last_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cleaning_cycles(id) on delete cascade,
  due_at timestamptz not null,
  status task_status not null default 'pending',
  assigned_to uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_cycle_id_idx on public.tasks(cycle_id);
create index tasks_due_at_idx on public.tasks(due_at);
create index tasks_assigned_to_idx on public.tasks(assigned_to);

------------------------------------------------------------------------------
-- updated_at trigger
------------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'homes', 'rooms', 'areas', 'items',
      'products', 'tools', 'instructions',
      'cleaning_cycles', 'tasks'
    ])
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I ' ||
      'for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table public.homes            enable row level security;
alter table public.home_members     enable row level security;
alter table public.rooms            enable row level security;
alter table public.areas            enable row level security;
alter table public.items            enable row level security;
alter table public.cleaning_cycles  enable row level security;
alter table public.tasks            enable row level security;
alter table public.products         enable row level security;
alter table public.tools            enable row level security;
alter table public.instructions     enable row level security;
alter table public.instruction_products enable row level security;
alter table public.instruction_tools    enable row level security;

-- homes
create policy "homes: members can read" on public.homes
  for select to authenticated using (public.is_home_member(id));

create policy "homes: owners can update" on public.homes
  for update to authenticated using (public.is_home_owner(id))
  with check (public.is_home_owner(id));

create policy "homes: owners can delete" on public.homes
  for delete to authenticated using (public.is_home_owner(id));

-- Any authenticated user can create a home; a trigger below makes them its
-- owner atomically.
create policy "homes: authenticated can insert" on public.homes
  for insert to authenticated with check (true);

create or replace function public.create_home_owner_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.home_members (home_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger homes_create_owner_membership
  after insert on public.homes
  for each row execute function public.create_home_owner_membership();

-- home_members
create policy "home_members: members can read their rows" on public.home_members
  for select to authenticated using (public.is_home_member(home_id));

create policy "home_members: owners manage membership" on public.home_members
  for all to authenticated
  using (public.is_home_owner(home_id))
  with check (public.is_home_owner(home_id));

-- rooms
create policy "rooms: members read" on public.rooms
  for select to authenticated using (public.is_home_member(home_id));

create policy "rooms: members write" on public.rooms
  for all to authenticated
  using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- areas
create policy "areas: members read" on public.areas
  for select to authenticated using (
    exists (select 1 from public.rooms r where r.id = room_id and public.is_home_member(r.home_id))
  );

create policy "areas: members write" on public.areas
  for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and public.is_home_member(r.home_id)))
  with check (exists (select 1 from public.rooms r where r.id = room_id and public.is_home_member(r.home_id)));

-- items
create policy "items: members read" on public.items
  for select to authenticated using (
    exists (
      select 1 from public.areas a
      join public.rooms r on r.id = a.room_id
      where a.id = area_id and public.is_home_member(r.home_id)
    )
  );

create policy "items: members write" on public.items
  for all to authenticated
  using (
    exists (
      select 1 from public.areas a
      join public.rooms r on r.id = a.room_id
      where a.id = area_id and public.is_home_member(r.home_id)
    )
  )
  with check (
    exists (
      select 1 from public.areas a
      join public.rooms r on r.id = a.room_id
      where a.id = area_id and public.is_home_member(r.home_id)
    )
  );

-- cleaning_cycles
create policy "cleaning_cycles: members read" on public.cleaning_cycles
  for select to authenticated using (
    exists (
      select 1 from public.items i
      join public.areas a on a.id = i.area_id
      join public.rooms r on r.id = a.room_id
      where i.id = item_id and public.is_home_member(r.home_id)
    )
  );

create policy "cleaning_cycles: members write" on public.cleaning_cycles
  for all to authenticated
  using (
    exists (
      select 1 from public.items i
      join public.areas a on a.id = i.area_id
      join public.rooms r on r.id = a.room_id
      where i.id = item_id and public.is_home_member(r.home_id)
    )
  )
  with check (
    exists (
      select 1 from public.items i
      join public.areas a on a.id = i.area_id
      join public.rooms r on r.id = a.room_id
      where i.id = item_id and public.is_home_member(r.home_id)
    )
  );

-- tasks
create policy "tasks: members read" on public.tasks
  for select to authenticated using (
    exists (
      select 1 from public.cleaning_cycles c
      join public.items i on i.id = c.item_id
      join public.areas a on a.id = i.area_id
      join public.rooms r on r.id = a.room_id
      where c.id = cycle_id and public.is_home_member(r.home_id)
    )
  );

create policy "tasks: members write" on public.tasks
  for all to authenticated
  using (
    exists (
      select 1 from public.cleaning_cycles c
      join public.items i on i.id = c.item_id
      join public.areas a on a.id = i.area_id
      join public.rooms r on r.id = a.room_id
      where c.id = cycle_id and public.is_home_member(r.home_id)
    )
  )
  with check (
    exists (
      select 1 from public.cleaning_cycles c
      join public.items i on i.id = c.item_id
      join public.areas a on a.id = i.area_id
      join public.rooms r on r.id = a.room_id
      where c.id = cycle_id and public.is_home_member(r.home_id)
    )
  );

-- Catalogue: readable by any authenticated user. Writes intentionally denied
-- (service role bypasses RLS; the CMS will run under it until an admin role
-- is modelled).
create policy "products: authenticated read" on public.products
  for select to authenticated using (true);

create policy "tools: authenticated read" on public.tools
  for select to authenticated using (true);

create policy "instructions: authenticated read" on public.instructions
  for select to authenticated using (true);

create policy "instruction_products: authenticated read" on public.instruction_products
  for select to authenticated using (true);

create policy "instruction_tools: authenticated read" on public.instruction_tools
  for select to authenticated using (true);
