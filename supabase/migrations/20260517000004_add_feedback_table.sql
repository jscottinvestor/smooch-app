-- User feedback collected via the in-app "Provide Feedback" button.
-- Each row captures who said what, on which page, and when.
--
-- RLS scopes inserts/selects to the row's own user. The admin view
-- (gated to the app author's email) uses the service-role client to
-- bypass RLS and read everyone's feedback.

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text,
  page text,
  message text not null,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on feedback(user_id);
create index feedback_created_at_idx on feedback(created_at desc);

alter table feedback enable row level security;

create policy "users insert own feedback"
  on feedback for insert with check (auth.uid() = user_id);
create policy "users select own feedback"
  on feedback for select using (auth.uid() = user_id);
