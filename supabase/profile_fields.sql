-- Adds a "school" field to profiles so users can share where they study.
-- Safe to re-run.

alter table public.profiles add column if not exists school text;
