-- Checks the favours rules (RLS, column grants, status trigger) inside a transaction that's rolled back.
-- Run: npm test (needs a linked project with the favours migration applied).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.invalid'),
  ('00000000-0000-0000-0000-00000000000d', 'guard@test.invalid');
update public.profiles set role = 'guard' where id = '00000000-0000-0000-0000-00000000000d';
insert into public.favours (id, title, location, points, requester_id)
values ('00000000-0000-0000-0000-0000000000f1', 'Test favour', 'Jalan Test', 10, '00000000-0000-0000-0000-00000000000a');

set local role authenticated;

-- A, the requester, can't accept their own favour.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$ begin
  update public.favours set status = 'accepted', helper_id = auth.uid() where title = 'Test favour';
  assert false, 'requester accepted their own favour';
exception when check_violation then null;
end $$;

-- D, a guard, can't accept favours: only residents take part.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
do $$ begin
  update public.favours set status = 'accepted', helper_id = auth.uid() where title = 'Test favour';
  assert not found, 'a guard accepted a favour';
end $$;

-- B accepts it, can't skip a step or touch the points, then completes it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  update public.favours set status = 'accepted', helper_id = auth.uid() where title = 'Test favour';
  assert found, 'helper could not accept';
  begin
    update public.favours set status = 'completed' where title = 'Test favour';
    assert false, 'skipped from accepted to completed';
  exception when raise_exception then null;
  end;
  begin
    update public.favours set points = 999 where title = 'Test favour';
    assert false, 'helper changed the points';
  exception when insufficient_privilege then null;
  end;
  update public.favours set status = 'in_progress' where title = 'Test favour';
  update public.favours set status = 'completed' where title = 'Test favour';
  assert (select status from public.favours where title = 'Test favour') = 'completed', 'helper could not complete';
end $$;

-- C can't take it over, and can't see it once it's no longer open.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
do $$ begin
  update public.favours set status = 'accepted', helper_id = auth.uid() where title = 'Test favour';
  assert not found, 'someone else took over an accepted favour';
  assert not exists (select from public.favours where title = 'Test favour'), 'outsider can see a taken favour';
end $$;

select 'ok' as favours_rules;
rollback;
