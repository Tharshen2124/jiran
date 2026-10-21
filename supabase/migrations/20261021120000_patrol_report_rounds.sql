-- Guards do three rounds a day (ROUNDS in lib/patrols.ts), and the report shows which rounds were done, so return the
-- rounds each checkpoint was passed in instead of how many. The return type changes, hence drop and create.
drop function public.patrol_report(timestamptz, timestamptz, interval);

-- The RA's monthly patrol report: per checkpoint, its passes in [from_at, to_at), the latest one, and the start of every
-- slot-long round (counted from from_at) with at least one pass. Runs as the caller, so RLS on patrol_events keeps
-- residents out. Aggregated here so a month of events never hits the API row limit.
create function public.patrol_report(from_at timestamptz, to_at timestamptz, slot interval)
returns table (checkpoint_id uuid, patrols bigint, last_at timestamptz, rounds timestamptz[])
language sql
stable
security invoker
set search_path = ''
as $$
  select checkpoint_id, count(*), max(created_at), array_agg(distinct date_bin(slot, created_at, from_at))
  from public.patrol_events
  where created_at >= from_at and created_at < to_at
  group by checkpoint_id;
$$;

revoke execute on function public.patrol_report from public, anon;
grant execute on function public.patrol_report to authenticated;
