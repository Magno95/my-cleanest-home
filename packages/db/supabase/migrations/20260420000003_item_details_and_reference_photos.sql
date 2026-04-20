-- Item detail enrichment:
--   * item-scoped cleaning guidance fields live directly on items for now.
--   * reference photos live in a dedicated public storage bucket.

alter table public.items
  add column if not exists reference_photo_path text,
  add column if not exists cleaning_method text,
  add column if not exists cleaning_tools text[] not null default '{}',
  add column if not exists cleaning_products text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('item-reference-photos', 'item-reference-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "item reference photos: public read" on storage.objects;
create policy "item reference photos: public read" on storage.objects
  for select to public using (bucket_id = 'item-reference-photos');

drop policy if exists "item reference photos: authenticated upload" on storage.objects;
create policy "item reference photos: authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'item-reference-photos');

drop policy if exists "item reference photos: authenticated update" on storage.objects;
create policy "item reference photos: authenticated update" on storage.objects
  for update to authenticated
  using (bucket_id = 'item-reference-photos')
  with check (bucket_id = 'item-reference-photos');

drop policy if exists "item reference photos: authenticated delete" on storage.objects;
create policy "item reference photos: authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'item-reference-photos');