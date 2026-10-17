-- Favours residents ask of each other. Points aren't stored per user: a helper's points are the sum of their completed favours.
create type public.favour_status as enum ('open', 'accepted', 'in_progress', 'completed', 'cancelled');

create table public.favours (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  location text not null,
  points integer not null check (points > 0),
  requester_id uuid not null references public.profiles on delete cascade,
  helper_id uuid references public.profiles on delete set null,
  status public.favour_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_help check (helper_id <> requester_id)
);

create index favours_requester_id_idx on public.favours (requester_id);
create index favours_helper_id_idx on public.favours (helper_id);

alter table public.favours enable row level security;

-- Residents can only accept a favour or move its status; everything else is fixed once posted (column-level grant).
revoke all on public.favours from anon, authenticated;
grant select on public.favours to authenticated;
grant update (status, helper_id) on public.favours to authenticated;

create policy "Residents can view open favours and their own"
on public.favours for select
to authenticated
using (status = 'open' or (select auth.uid()) in (requester_id, helper_id));

-- Accepting sets helper_id to yourself; after that only the helper can update it. The trigger below checks the status move.
create policy "Residents can accept open favours and update ones they help with"
on public.favours for update
to authenticated
using (status = 'open' or (select auth.uid()) = helper_id)
with check ((select auth.uid()) = helper_id);

create function private.check_favour_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Keep in sync with NEXT in lib/favours.ts.
  if (old.status, new.status) not in (
    ('open', 'accepted'),
    ('accepted', 'in_progress'), ('accepted', 'cancelled'),
    ('in_progress', 'completed'), ('in_progress', 'cancelled')
  ) then
    raise exception 'Can''t move this favour from % to %', old.status, new.status;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.check_favour_transition() from public, anon, authenticated;

create trigger check_favour_transition
  before update of status, helper_id on public.favours
  for each row execute function private.check_favour_transition();

-- Favours show who asked and who helped, so residents can see each other's names (and roles).
drop policy "Users can view their own profile" on public.profiles;

create policy "Residents can view all profiles"
on public.profiles for select
to authenticated
using (true);
