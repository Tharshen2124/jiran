-- Checks patrol detection (geofence, fast passes, vague fixes, dedup) and who can see patrols, in a rolled-back transaction.
-- Run: npm test (needs a linked project with the patrols migration applied).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'guard@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'resident@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'ra@test.invalid');
update public.profiles set role = 'guard' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'ra' where id = '00000000-0000-0000-0000-00000000000c';
-- Start from no patrols, whatever real guards have recorded (rolled back at the end).
delete from public.patrol_events;

-- Neighbouring jalans are ~47 m apart, so a 20 m checkpoint can only ever match its own street.
do $$ begin
  assert private.metres_to_segment(2.930777, 101.577556, 2.930389, 101.577346, 2.930389, 101.577346) between 40 and 55,
    'distance between neighbouring checkpoints is off';
end $$;

-- The guard's walk, one live location upsert per tick.
create temp table fixes (step int, lat float8, lng float8, accuracy float8);
insert into fixes values
  (1, 2.9200, 101.5700, 10),       -- far from everything
  (2, 2.930777, 101.577556, 50),   -- on 10/5 West, but too vague to prove it
  (3, 2.930777, 101.577556, 10),   -- on 10/5 West
  (4, 2.930777, 101.577556, 10),   -- still there next tick
  (5, 2.9200, 101.5700, 10),       -- far away again
  (6, 2.929621, 101.576574, 10),   -- 60 m west of the 10/8 West checkpoint…
  (7, 2.929523, 101.577674, 10);   -- …and 60 m east of it a tick later, never within 20 m of it at a tick
grant select on fixes to authenticated;

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$
declare f record;
begin
  for f in select * from fixes order by step loop
    insert into public.live_locations (user_id, lat, lng, accuracy) values (auth.uid(), f.lat, f.lng, f.accuracy)
    on conflict (user_id) do update set lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy;
    if f.step = 2 then assert not exists (select from public.patrol_events), 'vague or far fixes recorded a patrol'; end if;
  end loop;
  assert (select array_agg(c.jalan || ' ' || c.section order by c.jalan) from public.patrol_events e join public.checkpoints c on c.id = e.checkpoint_id)
    = array['Jalan SP 10/5 West', 'Jalan SP 10/8 West'], 'expected one 10/5 West event and one 10/8 West event';
  begin
    insert into public.patrol_events (guard_id, checkpoint_id) select auth.uid(), id from public.checkpoints limit 1;
    assert false, 'guard wrote a patrol event directly';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A resident on a checkpoint doesn't patrol it, and can't see the guard's patrols.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  insert into public.live_locations (user_id, lat, lng, accuracy) values (auth.uid(), 2.929172, 101.577016, 5);
  assert not exists (select from public.patrol_events), 'resident can see patrols';
  assert (select count(*) from public.checkpoints) = 16, 'resident can''t see checkpoints';
end $$;

-- The RA sees every patrol (for the monthly report), and the resident's visit isn't one of them.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
do $$ begin
  assert (select count(*) from public.patrol_events) = 2, 'RA should see exactly the guard''s two patrols';
  assert (select sum(patrols) from public.patrol_report(now() - interval '1 day', now() + interval '1 day', interval '2 hours')) = 2,
    'report should count the two patrols';
end $$;

-- The resident gets an empty report.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert not exists (select from public.patrol_report(now() - interval '1 day', now() + interval '1 day', interval '2 hours')),
    'resident can read the patrol report';
end $$;

select 'ok' as patrol_rules;
rollback;
