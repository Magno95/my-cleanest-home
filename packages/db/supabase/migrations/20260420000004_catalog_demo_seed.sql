-- Temporary local-dev convenience:
--   * make reference data readable without auth for local preview and testing.
--   * seed a small library of products and tools.

create policy "products: public read" on public.products
  for select to public using (true);

create policy "tools: public read" on public.tools
  for select to public using (true);

insert into public.products (id, name, brand, description)
values
  ('11111111-1111-1111-1111-111111111111', 'Sgrassatore cucina', 'VerdeCasa', 'Spray delicato per grasso leggero su piani e fornelli.'),
  ('11111111-1111-1111-1111-111111111112', 'Anticalcare bagno', 'Brilla', 'Rimuove calcare da lavabo, rubinetti e box doccia.'),
  ('11111111-1111-1111-1111-111111111113', 'Detergente vetri', 'Limpido', 'Lascia superfici a specchio senza aloni.'),
  ('11111111-1111-1111-1111-111111111114', 'Detergente neutro multiuso', 'NeutroLab', 'Adatto a superfici delicate e finiture esterne.'),
  ('11111111-1111-1111-1111-111111111115', 'Detergente piatti', 'CitrusDrop', 'Utile anche per pulizie leggere e sgrassaggio manuale.')
on conflict (id) do update set
  name = excluded.name,
  brand = excluded.brand,
  description = excluded.description;

insert into public.tools (id, name, description)
values
  ('22222222-2222-2222-2222-222222222221', 'Panno microfibra', 'Panno morbido per asciugare e rifinire senza graffi.'),
  ('22222222-2222-2222-2222-222222222222', 'Spugna morbida', 'Per strofinare superfici senza rovinarle.'),
  ('22222222-2222-2222-2222-222222222223', 'Panno vetri', 'Panno dedicato a vetri e specchi.'),
  ('22222222-2222-2222-2222-222222222224', 'Spatolina non abrasiva', 'Aiuta a staccare residui senza danneggiare il piano.'),
  ('22222222-2222-2222-2222-222222222225', 'Guanti', 'Protezione mani per detergenti e anticalcare.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;