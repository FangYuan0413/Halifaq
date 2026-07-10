-- Tracks whether an account has completed/skipped the onboarding tour, so
-- it can auto-show exactly once per account rather than once per browser.
-- Safe to re-run.
alter table public.profiles
  add column if not exists has_seen_tour boolean not null default false;

-- Important: back-fill every EXISTING account to true before this migration
-- was applied, the column doesn't exist yet, so this only needs to run
-- once, right after adding the column above — otherwise every current
-- user (not just genuinely new signups) would see the tour on their next
-- visit. Any row inserted after this point (i.e. any new signup) still
-- gets the column's default of false, so the tour keeps auto-showing for
-- real first-time users going forward.
update public.profiles set has_seen_tour = true;
