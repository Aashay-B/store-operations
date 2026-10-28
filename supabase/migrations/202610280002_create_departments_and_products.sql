create table public.departments (
  id smallint primary key generated always as identity,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index departments_name_key on public.departments (lower(name));

insert into public.departments (name) values
  ('Deli'), ('Meat'), ('Kitchen'), ('Bin/Office'), ('Juneau'), ('Grocery'), ('Confection');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  item_number text not null check (item_number <> ''),
  description text not null check (description <> ''),
  uip integer not null default 1 check (uip > 0),
  reg_price numeric(10, 2) not null check (reg_price >= 0),
  department_id smallint references public.departments (id) on update cascade on delete set null,
  begin_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_item_dept_key unique nulls not distinct (item_number, department_id),
  constraint products_date_range check (end_date is null or begin_date is null or end_date >= begin_date)
);
create index products_item_number_idx on public.products (item_number);
create index products_department_idx on public.products (department_id);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.products enable row level security;
create policy "store users can read departments" on public.departments for select to anon, authenticated using (true);
create policy "store users can read products" on public.products for select to anon, authenticated using (true);
