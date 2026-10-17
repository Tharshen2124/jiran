-- Jiran actors. Everyone signs up as a resident; RA and guard roles are granted by an admin:
--   update public.profiles set role = 'guard' where id = (select id from auth.users where email = '...');
create type public.user_role as enum ('resident', 'ra', 'guard');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.user_role not null default 'resident',
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read their own row and rename themselves, but never change their role (column-level grant).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Trigger function lives in an unexposed schema so it isn't callable through the Data API.
create schema if not exists private;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Role is never read from user metadata: it's user-editable.
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill users who signed up before this migration.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
from auth.users
on conflict (id) do nothing;
