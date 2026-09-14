-- Direct messages (DMs) between two users.
-- Legacy bootstrap script. New schema changes should go in supabase/migrations/.

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  body text,
  media_url text,
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  created_at timestamptz default now(),
  read boolean not null default false
);

create index if not exists messages_sender_recipient_idx
  on public.messages(sender_id, recipient_id);
create index if not exists messages_recipient_sender_idx
  on public.messages(recipient_id, sender_id);

alter table public.messages enable row level security;

drop policy if exists "Participants can view their messages" on public.messages;
create policy "Participants can view their messages" on public.messages
  for select using (
    (select auth.uid()) = sender_id or (select auth.uid()) = recipient_id
  );

drop policy if exists "Users can send messages, non-followers limited to 3" on public.messages;
create policy "Users can send messages, non-followers limited to 3" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and sender_id <> recipient_id
    and (
      exists (
        select 1 from public.follows f
        where f.follower_id = sender_id and f.following_id = recipient_id
      )
      or (
        select count(*) from public.messages m
        where m.sender_id = (select auth.uid()) and m.recipient_id = messages.recipient_id
      ) < 3
    )
  );

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read" on public.messages
  for update
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Message attachments are private. The app stores the object path in
-- messages.media_path and requests short-lived signed URLs when rendering.
insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view message media" on storage.objects;
drop policy if exists "Message participants can view message media" on storage.objects;
create policy "Message participants can view message media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.messages m
      where m.media_path = storage.objects.name
        and ((select auth.uid()) = m.sender_id or (select auth.uid()) = m.recipient_id)
    )
  );

drop policy if exists "Signed-in users can upload message media" on storage.objects;
drop policy if exists "Users can upload their own message media" on storage.objects;
create policy "Users can upload their own message media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own message media" on storage.objects;
create policy "Users can delete their own message media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'message-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

alter table public.profiles
  add column if not exists last_seen_activity_at timestamptz not null default now();
