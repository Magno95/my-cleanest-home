create type notification_digest_kind as enum ('morning', 'evening');
create type notification_delivery_status as enum ('pending', 'sent', 'failed');

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  digest_kind notification_digest_kind not null,
  digest_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null check (length(recipient_email) between 3 and 320),
  task_count integer not null check (task_count > 0),
  status notification_delivery_status not null default 'pending',
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_unique_digest unique (digest_kind, digest_date, user_id)
);

create index notification_deliveries_user_id_idx on public.notification_deliveries(user_id);
create index notification_deliveries_digest_date_idx on public.notification_deliveries(digest_date);

create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

alter table public.notification_deliveries enable row level security;
