-- Lets a user pick a color theme (dark / light / miku), saved so it follows
-- them across devices. Run once in the Supabase SQL Editor (safe to re-run).

alter table public.profiles
  add column if not exists theme text not null default 'dark'
  check (theme in ('dark', 'light', 'miku'));
