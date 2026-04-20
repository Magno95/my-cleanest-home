-- RLS helper functions must be VOLATILE so policy checks can observe rows
-- written by triggers earlier in the same statement (for example INSERT ...
-- RETURNING on homes after the owner membership trigger runs).

create or replace function public.is_home_member(target_home_id uuid) returns boolean
language sql volatile security definer set search_path = public as $$
  select exists (
    select 1
    from public.home_members hm
    where hm.home_id = target_home_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.is_home_owner(target_home_id uuid) returns boolean
language sql volatile security definer set search_path = public as $$
  select exists (
    select 1
    from public.home_members hm
    where hm.home_id = target_home_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;