-- Remove centralized instructions from runtime schema.
-- Cleaning method stays per-item; only products and tools remain shared.

drop policy if exists "instruction_tools: public read" on public.instruction_tools;
drop policy if exists "instruction_products: public read" on public.instruction_products;
drop policy if exists "instructions: public read" on public.instructions;

drop policy if exists "instruction_tools: authenticated read" on public.instruction_tools;
drop policy if exists "instruction_products: authenticated read" on public.instruction_products;
drop policy if exists "instructions: authenticated read" on public.instructions;

drop index if exists public.items_instruction_id_idx;

alter table public.items
  drop column if exists instruction_id;

drop table if exists public.instruction_products;
drop table if exists public.instruction_tools;
drop table if exists public.instructions;