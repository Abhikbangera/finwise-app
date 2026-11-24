-- 006_assistant_usage.sql
-- Daily question counter per user, so the AI assistant cannot run up your AI bill.

create table public.assistant_usage (
  user_id uuid    not null references auth.users(id) on delete cascade,
  day     date    not null default current_date,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;
create policy "assistant_usage_select_own" on public.assistant_usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.assistant_usage from anon, authenticated;
grant select on public.assistant_usage to authenticated;   -- users can see, never edit

-- Adds one to today's count for the logged-in user. Returns false once the limit is reached.
create or replace function public.bump_assistant_usage(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v integer;
begin
  if (select auth.uid()) is null then return false; end if;
  insert into public.assistant_usage (user_id, day, count)
  values ((select auth.uid()), current_date, 1)
  on conflict (user_id, day) do update set count = public.assistant_usage.count + 1
    where public.assistant_usage.count < p_limit
  returning count into v;
  return v is not null;
end $$;

revoke execute on function public.bump_assistant_usage(integer) from public, anon;
grant  execute on function public.bump_assistant_usage(integer) to authenticated;
