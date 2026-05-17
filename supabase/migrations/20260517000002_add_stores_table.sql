-- Stores: a per-user controlled vocabulary so the Inventory dropdown
-- and the Shopping-list grouping don't get fragmented by typos.
--
-- Products still hold the store name inline as text (for simplicity and
-- so existing data needs no transformation). The stores table is the
-- canonical list shown in dropdowns and managed in the "Manage stores"
-- dialog. Renaming a store updates both the row here AND all matching
-- products.

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index stores_user_id_idx on stores(user_id);

alter table stores enable row level security;

create policy "users select own stores"
  on stores for select using (auth.uid() = user_id);
create policy "users insert own stores"
  on stores for insert with check (auth.uid() = user_id);
create policy "users update own stores"
  on stores for update using (auth.uid() = user_id);
create policy "users delete own stores"
  on stores for delete using (auth.uid() = user_id);

-- Backfill: every distinct store name currently in use becomes a row.
-- `do nothing` covers the case where two products differ only by
-- whitespace casing — they collapse into one row here.
insert into stores (name, user_id)
select distinct trim(store), user_id
from products
where store is not null and trim(store) <> ''
on conflict (user_id, name) do nothing;
