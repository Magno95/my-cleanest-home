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

-- Create the unique index before the backfill loop so unique_violation can fire
-- during collision retries, making the loop safe in incremental environments.
create unique index homes_join_code_key on public.homes(join_code);

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

-- Set NOT NULL only after every existing row has a join_code.
alter table public.homes
  alter column join_code set not null;

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
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Must be authenticated';
  end if;

  trimmed_name := trim(name);
  if trimmed_name is null or trimmed_name = '' then
    raise exception 'Home name cannot be empty';
  end if;
  if length(trimmed_name) > 120 then
    raise exception 'Home name too long (max 120 chars)';
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
