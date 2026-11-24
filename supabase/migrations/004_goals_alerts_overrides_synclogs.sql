-- 004_goals_alerts_overrides_synclogs.sql
-- Requires 001-003. Creates the last four tables, all with RLS.

create table public.financial_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount  numeric(12,2) not null default 0 check (saved_amount >= 0),
  target_date   date,
  status        text not null default 'active' check (status in ('active','completed','paused')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index financial_goals_user_idx on public.financial_goals (user_id, status);

create table public.spending_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  budget_id     uuid not null,
  category_name text not null check (char_length(category_name) between 1 and 60),
  alert_type    text not null check (alert_type in ('warning_80','limit_reached','over_budget')),
  message       text not null check (char_length(message) <= 300),
  is_read       boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint spending_alerts_once unique (budget_id, category_name, alert_type),
  constraint spending_alerts_budget_fk foreign key (budget_id, user_id)
    references public.budgets (id, user_id) on delete cascade
);
create index spending_alerts_user_idx on public.spending_alerts (user_id, is_read, created_at desc);

create table public.budget_override_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  budget_id     uuid not null,
  category_name text not null check (char_length(category_name) between 1 and 60),
  amount        numeric(12,2) not null check (amount > 0),   -- extra room requested
  reason        text check (char_length(reason) <= 500),
  status        text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint override_budget_fk foreign key (budget_id, user_id)
    references public.budgets (id, user_id) on delete cascade
);
create index override_requests_budget_idx on public.budget_override_requests (budget_id, status);
create index override_requests_user_idx on public.budget_override_requests (user_id);

-- Once a request is decided it is final, and only its status may change.
create or replace function public.guard_override_update() returns trigger language plpgsql as $$
begin
  if old.status <> 'pending' then raise exception 'This request is already %', old.status; end if;
  if new.user_id <> old.user_id or new.budget_id <> old.budget_id or new.category_name <> old.category_name
     or new.amount <> old.amount or new.reason is distinct from old.reason then
    raise exception 'Only the status of a request can change';
  end if;
  if new.status <> 'pending' then new.decided_at := now(); end if;
  return new;
end $$;
create trigger override_guard before update on public.budget_override_requests
  for each row execute function public.guard_override_update();

-- Bank sync history. Users can read it; only a trusted server function will write it later.
create table public.bank_sync_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id       uuid,
  provider         text check (char_length(provider) <= 60),
  status           text not null default 'started' check (status in ('started','success','failed')),
  records_imported integer not null default 0 check (records_imported >= 0),
  error_message    text check (char_length(error_message) <= 500),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  constraint sync_logs_account_fk foreign key (account_id, user_id)
    references public.bank_accounts (id, user_id) on delete set null (account_id)
);
create index bank_sync_logs_user_idx on public.bank_sync_logs (user_id, started_at desc);

create trigger financial_goals_updated_at before update on public.financial_goals
  for each row execute function public.set_updated_at();
create trigger override_requests_updated_at before update on public.budget_override_requests
  for each row execute function public.set_updated_at();

alter table public.financial_goals          enable row level security;
alter table public.spending_alerts          enable row level security;
alter table public.budget_override_requests enable row level security;
alter table public.bank_sync_logs           enable row level security;

create policy "goals_select_own" on public.financial_goals for select to authenticated using (user_id = (select auth.uid()));
create policy "goals_insert_own" on public.financial_goals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "goals_update_own" on public.financial_goals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals_delete_own" on public.financial_goals for delete to authenticated using (user_id = (select auth.uid()));

create policy "alerts_select_own" on public.spending_alerts for select to authenticated using (user_id = (select auth.uid()));
create policy "alerts_insert_own" on public.spending_alerts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "alerts_update_own" on public.spending_alerts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alerts_delete_own" on public.spending_alerts for delete to authenticated using (user_id = (select auth.uid()));

create policy "overrides_select_own" on public.budget_override_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "overrides_insert_own" on public.budget_override_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy "overrides_update_own" on public.budget_override_requests for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "synclogs_select_own" on public.bank_sync_logs for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.financial_goals, public.spending_alerts, public.budget_override_requests, public.bank_sync_logs from anon;
grant select, insert, update, delete on public.financial_goals, public.spending_alerts to authenticated;
grant select, insert, update on public.budget_override_requests to authenticated;
grant select on public.bank_sync_logs to authenticated;
