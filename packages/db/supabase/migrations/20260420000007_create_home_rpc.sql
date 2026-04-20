-- Expected verification after this migration is applied:
-- select public.create_home('My test home');
-- Result: returns a UUID for the created home instead of a 42501 RLS error.

create or replace function public.create_home(name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_name text;
  new_home_id uuid;
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
  insert into public.homes (name)
    values (trimmed_name)
    returning id into new_home_id;
  insert into public.home_members (home_id, user_id, role)
    values (new_home_id, current_user_id, 'owner');
  return new_home_id;
end;
$$;

grant execute on function public.create_home(text) to authenticated;
