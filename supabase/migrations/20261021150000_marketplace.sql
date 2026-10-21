-- Marketplace: residents spend the points they earned helping neighbours on vouchers from Elmina shops.
-- A resident's balance is their completed favours' points minus what they've redeemed, so nothing is stored per user.
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  shop text not null,
  category text not null,
  icon text not null,
  cost integer not null check (cost > 0),
  created_at timestamptz not null default now()
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  reward_id uuid not null references public.rewards on delete restrict,
  -- The price paid, so changing a reward's cost later doesn't rewrite anyone's balance.
  cost integer not null check (cost > 0),
  code text not null unique,
  created_at timestamptz not null default now()
);

create index redemptions_user_id_idx on public.redemptions (user_id);
create index redemptions_reward_id_idx on public.redemptions (reward_id);

alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;

-- Read-only through the API: redemptions are only written by public.redeem below.
revoke all on public.rewards, public.redemptions from anon, authenticated;
grant select on public.rewards, public.redemptions to authenticated;

create policy "Residents can view rewards"
on public.rewards for select
to authenticated
using ((select role from public.profiles where id = (select auth.uid())) = 'resident');

create policy "Residents can view their own redemptions"
on public.redemptions for select
to authenticated
using ((select auth.uid()) = user_id);

-- Redeems a reward for the caller and returns the redemption. Locks the caller's profile row so two redemptions at
-- once can't both spend the same points.
create function public.redeem(reward uuid)
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

  select coalesce((select sum(points) from public.favours where helper_id = uid and status = 'completed'), 0)
       - coalesce((select sum(cost) from public.redemptions where user_id = uid), 0)
  into balance;
  if balance < price then
    raise exception 'You need % more points for this reward', price - balance;
  end if;

  insert into public.redemptions (user_id, reward_id, cost, code)
  values (uid, reward, price, 'JRN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.redeem from public, anon;
grant execute on function public.redeem to authenticated;

-- Demo catalogue (made-up shops around City of Elmina).
insert into public.rewards (title, description, shop, category, icon, cost) values
  ('Free kopi o ais', 'Any size iced black coffee, once.', 'Kopi Jiran, Elmina Business Park', 'Food & drink', '☕', 20),
  ('RM5 off nasi lemak set', 'On any set above RM12. Dine in or takeaway.', 'Warung Mak Teh', 'Food & drink', '🍛', 40),
  ('RM10 off your bill', 'On a bill of RM40 or more, weekdays only.', 'Elmina Lakeside Bistro', 'Food & drink', '🍽️', 80),
  ('RM10 grocery voucher', 'Spend it on anything except tobacco.', 'Kedai Runcit Elmina', 'Groceries', '🛒', 90),
  ('Fresh fruit box', 'A seasonal box of local fruit, ready for pickup on Saturday.', 'Pasar Tani Elmina', 'Groceries', '🍉', 150),
  ('Free wash and fold (5 kg)', 'One load, ready the next day.', 'Bersih Laundry', 'Services', '🧺', 60),
  ('Car wash and vacuum', 'Exterior wash plus interior vacuum for one car.', 'Kilat Car Care', 'Services', '🚗', 120),
  ('Aircond servicing, 30% off', 'For one wall-mounted unit, booked through the shop.', 'Sejuk Aircond Services', 'Services', '❄️', 250),
  ('Futsal court, 1 hour', 'Weeknight slot at the community court, booked at the counter.', 'Elmina Sports Hub', 'Community', '⚽', 100),
  ('Plant a tree in Central Park', 'Your name on a sapling at the next community planting day.', 'City of Elmina Residents Association', 'Community', '🌳', 200);
