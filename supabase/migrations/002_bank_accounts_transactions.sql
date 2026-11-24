-- 002_bank_accounts_transactions.sql
-- Requires 001_profiles.sql (uses public.set_updated_at()).

-- Manually registered accounts. Never store full account numbers: last 4 digits only.
create table public.bank_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  bank_name    text check (char_length(bank_name) <= 80),
  account_type text not null default 'savings'
               check (account_type in ('savings','current','credit_card','wallet','cash')),
  last4        char(4) check (last4 ~ '^[0-9]{4}$'),
  balance      numeric(14,2) not null default 0,
  is_manual    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint bank_accounts_id_user_unique unique (id, user_id)
);
create index bank_accounts_user_idx on public.bank_accounts (user_id);

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id  uuid,
  type        text not null check (type in ('income','expense')),
  amount      numeric(12,2) not null check (amount > 0),
  txn_date    date not null default current_date,
  description text check (char_length(description) <= 200),
  category    text not null default 'Other' check (char_length(category) between 1 and 60),
  bucket      text check (bucket in ('needs','wants','savings')),
  source      text not null default 'manual' check (source in ('manual','csv','bank_sync')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint income_has_no_bucket check (type = 'expense' or bucket is null),
  -- The account must belong to the same user, so nobody can attach another user's account
  constraint transactions_account_fk foreign key (account_id, user_id)
    references public.bank_accounts (id, user_id) on delete set null (account_id)
);
create index transactions_user_date_idx on public.transactions (user_id, txn_date desc);
create index transactions_user_type_date_idx on public.transactions (user_id, type, txn_date);
create index transactions_account_idx on public.transactions (account_id);

create trigger bank_accounts_updated_at before update on public.bank_accounts
  for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.bank_accounts enable row level security;
alter table public.transactions  enable row level security;

create policy "bank_accounts_select_own" on public.bank_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "bank_accounts_insert_own" on public.bank_accounts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "bank_accounts_update_own" on public.bank_accounts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "bank_accounts_delete_own" on public.bank_accounts for delete to authenticated using (user_id = (select auth.uid()));

create policy "transactions_select_own" on public.transactions for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions_insert_own" on public.transactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "transactions_update_own" on public.transactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transactions_delete_own" on public.transactions for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.bank_accounts, public.transactions from anon;
grant select, insert, update, delete on public.bank_accounts, public.transactions to authenticated;
