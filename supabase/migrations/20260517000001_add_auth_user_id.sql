-- Per-user data isolation: add user_id (FK to auth.users) to every table,
-- enable Row-Level Security, and add policies so each user can only read
-- and write their own rows.
--
-- user_id is added as NULLABLE in this migration so existing rows stay
-- valid. After the first real user signs up, a follow-up migration claims
-- those orphan rows under their account and then SETs NOT NULL.

-- ============================================================
-- 1) Add user_id columns
-- ============================================================
alter table categories
  add column user_id uuid references auth.users(id) on delete cascade;

alter table products
  add column user_id uuid references auth.users(id) on delete cascade;

alter table recipes
  add column user_id uuid references auth.users(id) on delete cascade;

alter table receipts
  add column user_id uuid references auth.users(id) on delete cascade;

-- ============================================================
-- 2) Default to the current authenticated user
-- ============================================================
-- With this default, application code doesn't need to pass user_id on
-- inserts; Postgres fills it in from the session's JWT. Combined with the
-- RLS INSERT policy below, this makes it impossible for a user to insert
-- a row tagged with someone else's user_id.
alter table categories alter column user_id set default auth.uid();
alter table products   alter column user_id set default auth.uid();
alter table recipes    alter column user_id set default auth.uid();
alter table receipts   alter column user_id set default auth.uid();

-- ============================================================
-- 3) Indexes
-- ============================================================
create index categories_user_id_idx on categories(user_id);
create index products_user_id_idx   on products(user_id);
create index recipes_user_id_idx    on recipes(user_id);
create index receipts_user_id_idx   on receipts(user_id);

-- ============================================================
-- 4) Enable RLS
-- ============================================================
alter table categories enable row level security;
alter table products   enable row level security;
alter table recipes    enable row level security;
alter table receipts   enable row level security;

-- ============================================================
-- 5) Policies: users only see/modify their own rows
-- ============================================================
-- categories
create policy "users select own categories"
  on categories for select
  using (auth.uid() = user_id);
create policy "users insert own categories"
  on categories for insert
  with check (auth.uid() = user_id);
create policy "users update own categories"
  on categories for update
  using (auth.uid() = user_id);
create policy "users delete own categories"
  on categories for delete
  using (auth.uid() = user_id);

-- products
create policy "users select own products"
  on products for select
  using (auth.uid() = user_id);
create policy "users insert own products"
  on products for insert
  with check (auth.uid() = user_id);
create policy "users update own products"
  on products for update
  using (auth.uid() = user_id);
create policy "users delete own products"
  on products for delete
  using (auth.uid() = user_id);

-- recipes
create policy "users select own recipes"
  on recipes for select
  using (auth.uid() = user_id);
create policy "users insert own recipes"
  on recipes for insert
  with check (auth.uid() = user_id);
create policy "users update own recipes"
  on recipes for update
  using (auth.uid() = user_id);
create policy "users delete own recipes"
  on recipes for delete
  using (auth.uid() = user_id);

-- receipts
create policy "users select own receipts"
  on receipts for select
  using (auth.uid() = user_id);
create policy "users insert own receipts"
  on receipts for insert
  with check (auth.uid() = user_id);
create policy "users update own receipts"
  on receipts for update
  using (auth.uid() = user_id);
create policy "users delete own receipts"
  on receipts for delete
  using (auth.uid() = user_id);
