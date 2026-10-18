-- A resident's live location while they share it with their home dashboard. One row per user: sharing upserts it every
-- few seconds and stopping deletes it, so toggling on or off twice is harmless. A closed tab can't delete its row, so
-- readers should treat a stale updated_at (older than ~30s, see TICK_MS in app/client.tsx) as no longer sharing.
create table public.live_locations (
  user_id uuid primary key references public.profiles on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy double precision not null check (accuracy >= 0), -- metres, as reported by the browser
  updated_at timestamptz not null default now()
);

alter table public.live_locations enable row level security;

revoke all on public.live_locations from anon, authenticated;
grant select, insert, update, delete on public.live_locations to authenticated;

-- Only you can see or change your own row. Select is needed too: upsert and delete read the existing row.
-- Nobody else reads locations through this app yet.
create policy "Users can manage their own live location"
on public.live_locations for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Freshness comes from the database clock, not the phone's, and every heartbeat bumps it even if the position is unchanged.
create function private.touch_live_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.touch_live_location() from public, anon, authenticated;

create trigger touch_live_location
  before insert or update on public.live_locations
  for each row execute function private.touch_live_location();
