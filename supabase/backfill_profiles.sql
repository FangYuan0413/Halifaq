-- Backfill: create a profiles row for any existing auth user that's missing one
-- (this happens for accounts created before the auto-profile trigger existed).
-- Safe to run more than once.

insert into public.profiles (id, username)
select id, split_part(email, '@', 1)
from auth.users
where id not in (select id from public.profiles);
