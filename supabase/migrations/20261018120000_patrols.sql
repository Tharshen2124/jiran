-- Guard patrols. Each jalan is split into sections, each with one checkpoint at its middle. A guard shares their live
-- location (live_locations), and every time it moves the database records a patrol event for any checkpoint the guard
-- passed. A section counts as patrolled while it has a recent event (see PATROL_WINDOW_MS in lib/patrols.ts).
create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  jalan text not null,
  section text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- ponytail: one radius for all; Jalan SP 10's streets are ~47 m apart, so keep it under half that to stay on one street.
  radius_m double precision not null default 20 check (radius_m > 0),
  path jsonb not null, -- the street section as [[lng, lat], ...], only for drawing it on the map
  created_at timestamptz not null default now(),
  unique (jalan, section)
);

create table public.patrol_events (
  id bigint generated always as identity primary key,
  guard_id uuid not null references public.profiles on delete cascade,
  checkpoint_id uuid not null references public.checkpoints on delete cascade,
  created_at timestamptz not null default now()
);

create index patrol_events_checkpoint_id_created_at_idx on public.patrol_events (checkpoint_id, created_at desc);
create index patrol_events_guard_id_created_at_idx on public.patrol_events (guard_id, created_at desc);

alter table public.checkpoints enable row level security;
alter table public.patrol_events enable row level security;

-- Checkpoints are managed in migrations; patrol events are only written by the trigger below.
revoke all on public.checkpoints, public.patrol_events from anon, authenticated;
grant select on public.checkpoints, public.patrol_events to authenticated;

create policy "Anyone signed in can view checkpoints"
on public.checkpoints for select
to authenticated
using (true);

-- Guards see the round they're on; the RA reads them for the monthly report.
create policy "Guards and the RA can view patrol events"
on public.patrol_events for select
to authenticated
using ((select role from public.profiles where id = (select auth.uid())) in ('guard', 'ra'));

-- Metres from a point to the segment a→b. Flat-earth maths is fine over a few hundred metres.
create function private.metres_to_segment(lat double precision, lng double precision,
  a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  -- Put the point at the origin, in metres, then find the closest spot on the segment (f runs 0..1 from a to b).
  with v as (
    select (a_lng - lng) * 111320 * cos(radians(lat)) as x1, (a_lat - lat) * 111320 as y1,
           (b_lng - lng) * 111320 * cos(radians(lat)) as x2, (b_lat - lat) * 111320 as y2
  ), t as (
    select x1, y1, x2 - x1 as dx, y2 - y1 as dy from v
  ), f as (
    select *, case when dx = 0 and dy = 0 then 0 else greatest(0, least(1, -(x1 * dx + y1 * dy) / (dx ^ 2 + dy ^ 2))) end as f from t
  )
  select sqrt((x1 + f * dx) ^ 2 + (y1 + f * dy) ^ 2) from f;
$$;

-- A guard's location only arrives every 10 seconds (TICK_MS in app/client.tsx), and a guard on a motorbike covers more
-- than a checkpoint's width in that time, so check the line from their last location to this one, not just this point.
create function private.record_patrol()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  from_lat double precision := new.lat;
  from_lng double precision := new.lng;
begin
  -- ponytail: a fix vaguer than 30 m could be on the next street over, so it can't prove a pass. Tune for real devices.
  if new.accuracy > 30 or (select role from public.profiles where id = new.user_id) is distinct from 'guard' then
    return null;
  end if;
  -- Only join up with the last location if it's a recent one and the jump between them is believable (≤ 150 m in a tick).
  if tg_op = 'UPDATE' and old.updated_at > now() - interval '30 seconds'
     and private.metres_to_segment(new.lat, new.lng, old.lat, old.lng, old.lat, old.lng) <= 150 then
    from_lat := old.lat;
    from_lng := old.lng;
  end if;
  -- Standing at a checkpoint sends a location every tick; one event per guard per checkpoint per 15 minutes is enough.
  insert into public.patrol_events (guard_id, checkpoint_id)
  select new.user_id, c.id
  from public.checkpoints c
  where private.metres_to_segment(c.lat, c.lng, from_lat, from_lng, new.lat, new.lng) <= c.radius_m
    and not exists (
      select from public.patrol_events e
      where e.guard_id = new.user_id and e.checkpoint_id = c.id and e.created_at > now() - interval '15 minutes'
    );
  return null;
end;
$$;

revoke execute on function private.metres_to_segment, private.record_patrol from public, anon, authenticated;

create trigger record_patrol
  after insert or update on public.live_locations
  for each row execute function private.record_patrol();

-- Jalan SP 10, Bandar Saujana Putra. Each jalan crosses the spine road, so it's split into the section west and east of
-- it; a guard riding down the spine passes the ends of every jalan, not their middles. Geometry from OpenStreetMap.
insert into public.checkpoints (jalan, section, lat, lng, path) values
  ('Jalan SP 10/5', 'West', 2.930777, 101.577556, '[[101.5769,2.930878],[101.576975,2.930825],[101.577529,2.930779],[101.578229,2.930722]]'),
  ('Jalan SP 10/5', 'East', 2.930644, 101.579072, '[[101.578229,2.930722],[101.579143,2.930637],[101.579916,2.930565]]'),
  ('Jalan SP 10/6', 'West', 2.930389, 101.577346, '[[101.576497,2.93046],[101.577116,2.93041],[101.578194,2.930312]]'),
  ('Jalan SP 10/6', 'East', 2.930234, 101.578999, '[[101.578194,2.930312],[101.579289,2.930207],[101.579804,2.930154]]'),
  ('Jalan SP 10/7', 'West', 2.929978, 101.577234, '[[101.576316,2.930069],[101.576413,2.930047],[101.57689,2.930007],[101.578155,2.929901]]'),
  ('Jalan SP 10/7', 'East', 2.929821, 101.578922, '[[101.578155,2.929901],[101.579071,2.929806],[101.57969,2.92975]]'),
  ('Jalan SP 10/8', 'West', 2.929577, 101.577124, '[[101.576122,2.929654],[101.576961,2.929593],[101.578124,2.92948]]'),
  ('Jalan SP 10/8', 'East', 2.929416, 101.578853, '[[101.578124,2.92948],[101.578887,2.929413],[101.579582,2.929343]]'),
  ('Jalan SP 10/9', 'West', 2.929172, 101.577016, '[[101.57595,2.929284],[101.57605,2.929251],[101.577079,2.929167],[101.578087,2.929076]]'),
  ('Jalan SP 10/9', 'East', 2.929007, 101.578780, '[[101.578087,2.929076],[101.578554,2.92903],[101.579473,2.928937]]'),
  ('Jalan SP 10/10', 'West', 2.928766, 101.576899, '[[101.575753,2.928863],[101.576887,2.928767],[101.578045,2.92866]]'),
  ('Jalan SP 10/10', 'East', 2.928600, 101.578707, '[[101.578045,2.92866],[101.578526,2.928619],[101.579368,2.928533]]'),
  ('Jalan SP 10/11', 'West', 2.928344, 101.576983, '[[101.575967,2.92838],[101.576019,2.928408],[101.576068,2.928422],[101.577033,2.928339],[101.578007,2.92825]]'),
  ('Jalan SP 10/11', 'East', 2.928187, 101.578631, '[[101.578007,2.92825],[101.57845,2.928206],[101.579256,2.928122]]'),
  ('Jalan SP 10/12', 'West', 2.927909, 101.577156, '[[101.576346,2.927945],[101.576437,2.927972],[101.576499,2.927971],[101.577164,2.927908],[101.577971,2.927838]]'),
  ('Jalan SP 10/12', 'East', 2.927781, 101.578559, '[[101.577971,2.927838],[101.57842,2.927794],[101.579147,2.927723]]');
