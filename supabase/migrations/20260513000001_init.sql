-- Initial schema for the Baking Buddy app.
-- Single-user app gated by a shared password in Next.js middleware.
-- RLS intentionally left disabled; the URL gate is the access control.

create extension if not exists "pgcrypto";

-- ============================================================
-- categories: hierarchical (top-level groups + sub-categories)
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_parent_id_idx on categories(parent_id);

-- ============================================================
-- products: catalog rows. stock is in packages, NOT package_unit.
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  store text,
  category_id uuid references categories(id) on delete set null,
  package_size numeric not null default 0,
  package_unit text not null default 'g',
  price numeric not null default 0,
  -- In packages (fractional ok). e.g., 2.5 = 2.5 bags.
  stock numeric not null default 0,
  -- Array of {fromQty, fromUnit, toQty, toUnit}
  conversions jsonb not null default '[]'::jsonb,
  -- Array of {date, price, source} where source is 'manual' | 'receipt'
  price_history jsonb not null default '[]'::jsonb,
  -- Normalized (uppercase, single-space) raw receipt strings that map here
  receipt_aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on products(category_id);
-- GIN index makes alias lookups (= any() / && operators) fast.
create index products_receipt_aliases_idx on products using gin (receipt_aliases);

-- ============================================================
-- recipes: ingredients stored as denormalized jsonb (matches prototype shape)
-- ============================================================
create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  batches integer not null default 1,
  -- Fractional allowed (e.g., 12.5 items/batch).
  -- Mapped to `itemsPerBatch` on the TS side — the column name is
  -- kept for historical reasons; renaming it would require a migration.
  cookies_per_batch numeric not null default 1,
  -- Array of Ingredient objects (see lib/types.ts)
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- receipts: header + lines as jsonb
-- ============================================================
create table receipts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  store text not null,
  total numeric,
  -- Array of ReceiptLine objects (see lib/types.ts)
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_date_idx on receipts(date desc);

-- ============================================================
-- updated_at triggers: bump updated_at on every UPDATE
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger categories_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger recipes_updated_at before update on recipes
  for each row execute function set_updated_at();
create trigger receipts_updated_at before update on receipts
  for each row execute function set_updated_at();
