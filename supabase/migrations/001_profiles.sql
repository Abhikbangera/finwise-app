-- 001_profiles.sql

-- Shared helper: keeps updated_at current on every update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- One profile per signed-up user
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  currency       char(3) not null default 'INR',
  monthly_income numeric(12,2) not null default 0 check (monthly_income >= 0),
  needs_pct      smallint not null default 50,
  wants_pct      smallint not null default 30,
  savings_pct    smallint not null default 20,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint pct_range   check (needs_pct between 0 and 100
                            and wants_pct between 0 and 100
                            and savings_pct between 0 and 100),
  constraint split_is_100 check (needs_pct + wants_pct + savings_pct = 100)
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Row Level Security: a user can only see and edit their own row.
-- There is deliberately no insert or delete policy: the signup trigger
-- creates the row, and deleting a user removes it automatically.
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: accounts you already created before this trigger existed
insert into public.profiles (id, full_name)
select id, nullif(trim(raw_user_meta_data ->> 'full_name'), '')
from auth.users
on conflict (id) do nothing;
