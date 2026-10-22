-- The RA handles favours no neighbour has taken up (the app flags ones open for a week): they can take one on
-- themselves, or add extra points and/or a voucher for whoever completes it.
alter table public.favours
  -- Kept apart from points: home dashboards recalculate and cap points when they bump, which would wipe them.
  -- A helper earns points + boost_points.
  add column boost_points integer not null default 0 check (boost_points >= 0),
  -- A free voucher the helper gets when they complete the favour.
  add column reward_id uuid references public.rewards on delete set null;

create index favours_reward_id_idx on public.favours (reward_id);

-- The RA takes favours on like a resident: accept, then move the status.
drop policy "Residents can accept open favours and update ones they help with" on public.favours;

create policy "Residents and the RA can accept open favours and update ones they help with"
on public.favours for update
to authenticated
using (
  (select role from public.profiles where id = (select auth.uid())) in ('resident', 'ra')
  and (status = 'open' or (select auth.uid()) = helper_id)
)
with check ((select auth.uid()) = helper_id);

-- The RA picks vouchers from the marketplace catalogue.
drop policy "Residents can view rewards" on public.rewards;

create policy "Residents and the RA can view rewards"
on public.rewards for select
to authenticated
using ((select role from public.profiles where id = (select auth.uid())) in ('resident', 'ra'));

-- Adds extra points and/or a voucher to an open favour. The RA only; residents' column grants can't touch these.
create function public.boost_favour(favour uuid, extra integer, reward uuid default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'ra' then
    raise exception 'Only the resident administration can add rewards to favours';
  end if;
  if extra is null or extra not between 0 and 100 then
    raise exception 'Extra points must be between 0 and 100';
  end if;
  if extra = 0 and reward is null then
    raise exception 'Add some points or pick a voucher';
  end if;

  update public.favours
  set boost_points = boost_points + extra, reward_id = coalesce(reward, reward_id)
  where id = favour and status = 'open';
  if not found then
    raise exception 'Someone has already taken up this favour';
  end if;
end;
$$;

revoke execute on function public.boost_favour from public, anon;
grant execute on function public.boost_favour to authenticated;

-- A favour's voucher is free, so a redemption can cost nothing. Both kinds get their code from the default.
alter table public.redemptions
  drop constraint redemptions_cost_check,
  add constraint redemptions_cost_check check (cost >= 0),
  alter column code set default 'JRN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

create function private.issue_favour_voucher()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.redemptions (user_id, reward_id, cost) values (new.helper_id, new.reward_id, 0);
  return null;
end;
$$;

revoke execute on function private.issue_favour_voucher() from public, anon, authenticated;

-- check_favour_transition only lets a favour reach completed once.
create trigger issue_favour_voucher
  after update of status on public.favours
  for each row when (new.status = 'completed' and new.reward_id is not null)
  execute function private.issue_favour_voucher();

-- Same as before, but the balance counts boost_points and the code comes from the column default.
create or replace function public.redeem(reward uuid)
returns public.redemptions
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  price integer;
  balance integer;
  result public.redemptions;
begin
  perform from public.profiles where id = uid and role = 'resident' for update;
  if not found then
    raise exception 'Only residents can redeem rewards';
  end if;

  select cost into price from public.rewards where id = reward;
  if price is null then
    raise exception 'This reward is no longer available';
  end if;

  select coalesce((select sum(points + boost_points) from public.favours where helper_id = uid and status = 'completed'), 0)
       - coalesce((select sum(cost) from public.redemptions where user_id = uid), 0)
  into balance;
  if balance < price then
    raise exception 'You need % more points for this reward', price - balance;
  end if;

  insert into public.redemptions (user_id, reward_id, cost)
  values (uid, reward, price)
  returning * into result;
  return result;
end;
$$;
