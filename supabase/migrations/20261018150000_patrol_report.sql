-- The RA's monthly patrol report: per checkpoint, its passes in [from_at, to_at), the latest one, and how many
-- slot-long rounds (PATROL_WINDOW_MS in lib/patrols.ts) had at least one pass; the app turns rounds into missed rounds.
-- Runs as the caller, so RLS on patrol_events keeps residents out. Aggregated here so a month of events never hits the
-- API row limit.
create function public.patrol_report(from_at timestamptz, to_at timestamptz, slot interval)
returns table (checkpoint_id uuid, patrols bigint, last_at timestamptz, rounds bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select checkpoint_id, count(*), max(created_at), count(distinct date_bin(slot, created_at, from_at))
  from public.patrol_events
  where created_at >= from_at and created_at < to_at
  group by checkpoint_id;
$$;

revoke execute on function public.patrol_report from public, anon;
grant execute on function public.patrol_report to authenticated;

-- Each role has its own dashboard: only residents take part in favours, guards and the RA just see their own pages.
drop policy "Residents can accept open favours and update ones they help with" on public.favours;

create policy "Residents can accept open favours and update ones they help with"
on public.favours for update
to authenticated
using (
  (select role from public.profiles where id = (select auth.uid())) = 'resident'
  and (status = 'open' or (select auth.uid()) = helper_id)
)
with check ((select auth.uid()) = helper_id);
