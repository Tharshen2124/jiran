-- Guardian Angel: a resident heading home tells their house when they expect to arrive, then checks in when they get
-- there. While a trip is on (arrived_at is null) the house's surveillance system is active, and its home dashboard
-- (Jiran-Dashboard, secret key) shows the trip. One row per resident: starting a new trip replaces their last one.

-- A resident's home. Set by an admin, like roles:
--   update public.profiles set house_id = '<houses.id>' where id = (select id from auth.users where email = '...');
alter table public.profiles add column house_id uuid references public.houses on delete set null;
create index profiles_house_id_idx on public.profiles (house_id);

-- Residents can read their own house (a trip's destination). Writes stay revoked.
grant select on public.houses to authenticated;

create policy "Residents can view their house"
on public.houses for select
to authenticated
using (id = (select house_id from public.profiles where id = (select auth.uid())));

create table public.guardian_angels (
  user_id uuid primary key references public.profiles on delete cascade,
  house_id uuid not null references public.houses on delete cascade,
  eta timestamptz not null,
  started_at timestamptz not null default now(),
  arrived_at timestamptz,
  check (eta > started_at)
);

create index guardian_angels_house_id_idx on public.guardian_angels (house_id);

alter table public.guardian_angels enable row level security;

revoke all on public.guardian_angels from anon, authenticated;
grant select, insert, update on public.guardian_angels to authenticated;

-- Only your own trip, and it always heads to your own house.
create policy "Residents manage their own guardian angel"
on public.guardian_angels for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and house_id = (select house_id from public.profiles where id = (select auth.uid()))
);

-- More demo houses, so the dashboard's house picker has a choice.
insert into public.houses (address) values ('No. 8, Jalan SP 10/5'), ('No. 21, Jalan SP 10/9');
