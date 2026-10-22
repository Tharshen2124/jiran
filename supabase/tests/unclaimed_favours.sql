-- Checks the RA's unclaimed-favour rules (boosts, free vouchers, the RA taking favours on) inside a transaction that's
-- rolled back. Run: npm test (needs a linked project with the unclaimed_favours migration applied).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000e', 'ra@test.invalid');
update public.profiles set role = 'ra' where id = '00000000-0000-0000-0000-00000000000e';
insert into public.favours (id, title, location, points, requester_id, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', 'Old favour', 'Jalan Test', 10, '00000000-0000-0000-0000-00000000000a', now() - interval '8 days'),
  ('00000000-0000-0000-0000-0000000000f2', 'Other favour', 'Jalan Test', 5, '00000000-0000-0000-0000-00000000000a', now() - interval '9 days');
insert into public.rewards (id, title, shop, category, icon, cost) values
  ('00000000-0000-0000-0000-0000000000e1', 'Test 20', 'Test shop', 'Test', 'x', 20);

set local role authenticated;

-- B, a resident, can't boost a favour, through the RPC or the table.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  begin
    perform public.boost_favour('00000000-0000-0000-0000-0000000000f1', 10);
    assert false, 'a resident boosted a favour';
  exception when raise_exception then null;
  end;
  begin
    update public.favours set boost_points = 10 where title = 'Old favour';
    assert false, 'a resident wrote boost_points';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The RA adds 10 points and a voucher, but not negative points or nothing at all, and sees the voucher catalogue.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', true);
do $$ begin
  assert exists (select from public.rewards), 'the RA can''t see rewards';
  perform public.boost_favour('00000000-0000-0000-0000-0000000000f1', 10, '00000000-0000-0000-0000-0000000000e1');
  begin
    perform public.boost_favour('00000000-0000-0000-0000-0000000000f1', -5);
    assert false, 'boosted with negative points';
  exception when raise_exception then null;
  end;
  begin
    perform public.boost_favour('00000000-0000-0000-0000-0000000000f1', 0);
    assert false, 'boosted with nothing';
  exception when raise_exception then null;
  end;
end $$;

-- B takes it up and completes it: 10 + 10 points and a free voucher, so the balance covers a 20-point reward.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$
declare r public.redemptions;
begin
  update public.favours set status = 'accepted', helper_id = auth.uid() where title = 'Old favour';
  update public.favours set status = 'in_progress' where title = 'Old favour';
  update public.favours set status = 'completed' where title = 'Old favour';
  assert (select count(*) from public.redemptions where cost = 0 and code like 'JRN-%') = 1, 'no free voucher on completion';
  r := public.redeem('00000000-0000-0000-0000-0000000000e1');
  assert r.cost = 20 and r.code like 'JRN-%', 'boost points not counted in the balance';
end $$;

-- The RA can't boost a favour that's been taken up, and can take one on and complete it themselves.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', true);
do $$ begin
  begin
    perform public.boost_favour('00000000-0000-0000-0000-0000000000f1', 5);
    assert false, 'boosted a completed favour';
  exception when raise_exception then null;
  end;
  update public.favours set status = 'accepted', helper_id = auth.uid() where title = 'Other favour';
  assert found, 'the RA could not take a favour on';
  update public.favours set status = 'in_progress' where title = 'Other favour';
  update public.favours set status = 'completed' where title = 'Other favour';
  assert (select status from public.favours where title = 'Other favour') = 'completed', 'the RA could not complete it';
end $$;

select 'ok' as unclaimed_favours_rules;
rollback;
