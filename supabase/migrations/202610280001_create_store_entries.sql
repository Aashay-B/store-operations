create type public.store_entry_kind as enum ('order_request', 'inventory_cycle');
create type public.store_entry_status as enum ('open', 'reviewed', 'completed');

create table public.store_entries (
  id uuid primary key default gen_random_uuid(),
  kind public.store_entry_kind not null,
  item_number text not null,
  description text not null,
  aisle text not null,
  quantity_required integer,
  department text,
  on_hand integer,
  best_before date,
  status public.store_entry_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint order_requires_quantity check (kind <> 'order_request' or quantity_required is not null),
  constraint cycle_requires_count check (kind <> 'inventory_cycle' or (department is not null and on_hand is not null))
);
alter table public.store_entries enable row level security;
create policy "store users can read entries" on public.store_entries for select to anon, authenticated using (true);
create policy "store users can create entries" on public.store_entries for insert to anon, authenticated with check (true);
