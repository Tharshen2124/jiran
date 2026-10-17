-- Checks the live location rules (RLS, idempotent upsert/delete, server-side timestamps) inside a transaction that's rolled back.
-- Run: npm test (needs a linked project with the live_locations migration applied).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid');

set local role authenticated;

-- A starts sharing twice (the same upsert supabase-js sends) and still has one row, stamped by the database, not the client.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$ begin
  insert into public.live_locations (user_id, lat, lng, accuracy, updated_at) values (auth.uid(), 3.1, 101.5, 10, '2000-01-01')
  on conflict (user_id) do update set user_id = excluded.user_id, lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy, updated_at = excluded.updated_at;
  insert into public.live_locations (user_id, lat, lng, accuracy) values (auth.uid(), 3.2, 101.6, 5)
  on conflict (user_id) do update set user_id = excluded.user_id, lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy;
  assert (select count(*) from public.live_locations) = 1, 'second start made a second row';
  assert (select lat from public.live_locations) = 3.2, 'heartbeat did not move the location';
  assert (select updated_at from public.live_locations) = now(), 'client set its own timestamp';
end $$;

-- B can't see, overwrite, share as or delete A.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert not exists (select from public.live_locations), 'B can see A''s location';
  delete from public.live_locations where user_id = '00000000-0000-0000-0000-00000000000a';
  assert not found, 'B deleted A''s location';
  begin
    insert into public.live_locations (user_id, lat, lng, accuracy) values ('00000000-0000-0000-0000-00000000000a', 0, 0, 1)
    on conflict (user_id) do update set lat = excluded.lat;
    assert false, 'B overwrote A''s location';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A stops sharing twice; the second stop is a no-op, not an error.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$ begin
  delete from public.live_locations where user_id = auth.uid();
  assert found, 'A could not stop sharing';
  delete from public.live_locations where user_id = auth.uid();
  assert not exists (select from public.live_locations), 'row survived stopping';
end $$;

select 'ok' as live_location_rules;
rollback;
