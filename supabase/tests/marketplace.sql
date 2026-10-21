-- Checks the marketplace rules (who sees rewards, balance checks, no direct writes) inside a transaction that's rolled back.
-- Run: npm test (needs a linked project with the marketplace migration applied).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000d', 'guard@test.invalid');
update public.profiles set role = 'guard' where id = '00000000-0000-0000-0000-00000000000d';
-- B has earned 50 points.
insert into public.favours (title, location, points, requester_id, helper_id, status)
values ('Test favour', 'Jalan Test', 50, '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'completed');
insert into public.rewards (id, title, shop, category, icon, cost) values
  ('00000000-0000-0000-0000-0000000000e1', 'Test 30', 'Test shop', 'Test', 'x', 30),
  ('00000000-0000-0000-0000-0000000000e2', 'Test 999', 'Test shop', 'Test', 'x', 999);

set local role authenticated;

-- D, a guard, can't see or redeem rewards.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
do $$ begin
  assert not exists (select from public.rewards), 'a guard can see rewards';
  perform public.redeem('00000000-0000-0000-0000-0000000000e1');
  assert false, 'a guard redeemed a reward';
exception when raise_exception then null;
end $$;

-- B redeems once (50 → 20), then can't afford it again or anything too dear, and can't write redemptions directly.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$
declare r public.redemptions;
begin
  r := public.redeem('00000000-0000-0000-0000-0000000000e1');
  assert r.cost = 30 and r.code like 'JRN-%', 'redemption not issued';
  begin
    perform public.redeem('00000000-0000-0000-0000-0000000000e1');
    assert false, 'redeemed with too few points';
  exception when raise_exception then null;
  end;
  begin
    perform public.redeem('00000000-0000-0000-0000-0000000000e2');
    assert false, 'redeemed a reward costing more than the balance';
  exception when raise_exception then null;
  end;
  begin
    insert into public.redemptions (user_id, reward_id, cost, code)
    values (auth.uid(), '00000000-0000-0000-0000-0000000000e2', 1, 'FREE');
    assert false, 'inserted a redemption directly';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.redemptions) = 1, 'resident does not see exactly their redemption';
end $$;

-- A can't see B's vouchers.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$ begin
  assert not exists (select from public.redemptions), 'someone else''s voucher is visible';
end $$;

select 'ok' as marketplace_rules;
rollback;
