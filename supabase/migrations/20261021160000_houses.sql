-- Each home dashboard is a house. Dashboards have no login: they post favours on behalf of the house,
-- so a favour is asked by either a resident (requester_id) or a house (house_id), never both.
create table public.houses (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  created_at timestamptz not null default now()
);

-- Only dashboards read houses, server-side with the secret key (bypasses RLS). Favours copy the address into location.
alter table public.houses enable row level security;
revoke all on public.houses from anon, authenticated;

alter table public.favours
  alter column requester_id drop not null,
  add column house_id uuid references public.houses on delete cascade,
  add constraint favours_one_requester check (num_nonnulls(requester_id, house_id) = 1);

create index favours_house_id_idx on public.favours (house_id);
