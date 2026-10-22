-- Checks the Guardian Angel rules (trips only to your own house, nobody else's trips, house links are admin-only) inside
-- a transaction that's rolled back. Run: npm test (needs a linked project with the guardian angel migration applied).
begin;

insert into public.houses (id, address) values
  ('00000000-0000-0000-0000-0000000000f1', 'Test house 1'),
  ('00000000-0000-0000-0000-0000000000f2', 'Test house 2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid');
update public.profiles set house_id = '00000000-0000-0000-0000-0000000000f1' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set house_id = '00000000-0000-0000-0000-0000000000f2' where id = '00000000-0000-0000-0000-00000000000b';

set local role authenticated;

-- A heads home and checks in, sees only their own house, and can't redirect the trip or change their house.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$ begin
  insert into public.guardian_angels (user_id, house_id, eta)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000f1', now() + interval '30 minutes');
  assert (select array_agg(address) from public.houses) = '{"Test house 1"}', 'resident sees houses other than their own';
  begin
    update public.guardian_angels set house_id = '00000000-0000-0000-0000-0000000000f2';
    assert false, 'moved a trip to another house';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set house_id = '00000000-0000-0000-0000-0000000000f2' where id = auth.uid();
    assert false, 'resident changed their own house';
  exception when insufficient_privilege then null;
  end;
  update public.guardian_angels set arrived_at = now() where user_id = auth.uid();
  assert (select arrived_at is not null from public.guardian_angels), 'check-in not saved';
  -- Starting again replaces the last trip (what the app's upsert does).
  insert into public.guardian_angels (user_id, house_id, eta, started_at, arrived_at)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000f1', now() + interval '1 hour', now(), null)
  on conflict (user_id) do update set eta = excluded.eta, started_at = excluded.started_at, arrived_at = excluded.arrived_at;
  assert (select arrived_at is null from public.guardian_angels), 'a new trip did not replace the last one';
end $$;

-- B can't see A's trip or start one for them.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert not exists (select from public.guardian_angels), 'someone else''s trip is visible';
  begin
    insert into public.guardian_angels (user_id, house_id, eta)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000f2', now() + interval '1 hour');
    assert false, 'started a trip for someone else';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'ok' as guardian_angel_rules;
