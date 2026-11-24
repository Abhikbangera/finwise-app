-- 003_budgets.sql
-- Requires 001 and 002. One budget per user per month, with category limits.

create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month       date not null check (extract(day from month) = 1),   -- first day of the month
  income      numeric(12,2) not null default 0 check (income >= 0), -- planned income for the month
  needs_pct   smallint not null default 50,
  wants_pct   smallint not null default 30,
  savings_pct smallint not null default 20,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint budgets_pct_range check (needs_pct between 0 and 100 and wants_pct between 0 and 100 and savings_pct between 0 and 100),
  constraint budgets_split_is_100 check (needs_pct + wants_pct + savings_pct = 100),
  constraint budgets_user_month_unique unique (user_id, month),
  constraint budgets_id_user_unique unique (id, user_id)
);

create table public.budget_categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  budget_id    uuid not null,
  name         text not null check (char_length(name) between 1 and 60),
  bucket       text not null check (bucket in ('needs','wants','savings')),
  limit_amount numeric(12,2) not null default 0 check (limit_amount >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint budget_categories_name_unique unique (budget_id, name),
  -- the budget must belong to the same user
  constraint budget_categories_budget_fk foreign key (budget_id, user_id)
    references public.budgets (id, user_id) on delete cascade
);
create index budgets_user_month_idx on public.budgets (user_id, month desc);
create index budget_categories_budget_idx on public.budget_categories (budget_id);
create index budget_categories_user_idx on public.budget_categories (user_id);

create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger budget_categories_updated_at before update on public.budget_categories
  for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;

create policy "budgets_select_own" on public.budgets for select to authenticated using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets for insert to authenticated with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets for delete to authenticated using (user_id = (select auth.uid()));

create policy "budget_categories_select_own" on public.budget_categories for select to authenticated using (user_id = (select auth.uid()));
create policy "budget_categories_insert_own" on public.budget_categories for insert to authenticated with check (user_id = (select auth.uid()));
create policy "budget_categories_update_own" on public.budget_categories for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budget_categories_delete_own" on public.budget_categories for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.budgets, public.budget_categories from anon;
grant select, insert, update, delete on public.budgets, public.budget_categories to authenticated;
