-- 005_dashboard_totals.sql
-- Monthly income and expense totals, summed inside the database so the dashboard
-- stays correct no matter how many transactions a user has.
-- SECURITY INVOKER: it runs as the logged-in user, so RLS applies, and it also
-- filters on the caller's own id as a second guard.
create or replace function public.monthly_totals(p_from date, p_to date)
returns table (month date, income numeric, expense numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select date_trunc('month', t.txn_date)::date as month,
         coalesce(sum(t.amount) filter (where t.type = 'income'), 0)  as income,
         coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.txn_date >= p_from and t.txn_date < p_to
  group by 1
  order by 1
$$;

revoke execute on function public.monthly_totals(date, date) from public, anon;
grant  execute on function public.monthly_totals(date, date) to authenticated;
