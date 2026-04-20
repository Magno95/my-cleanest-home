alter table public.rooms
add column color_key text
check (color_key is null or color_key in ('rose', 'mint', 'sky', 'amber', 'violet'));