-- Switch from auto-rebuild-on-every-change to a manual "Publish" model.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- 1. Drop the auto-trigger and function (set up earlier in webhook.sql)
drop trigger if exists frame_examples_rebuild on public.frame_examples;
drop function if exists public.notify_vercel_rebuild();

-- 2. Track the last time we published. Single-row table.
create table if not exists public.publish_state (
  id int primary key default 1,
  last_published_at timestamptz not null default now(),
  constraint publish_state_single_row check (id = 1)
);

insert into public.publish_state (id, last_published_at)
  values (1, now())
  on conflict (id) do nothing;

-- Read by anyone (so the admin can show "X pending changes" without auth in dev),
-- write only by authenticated users (admin).
alter table public.publish_state enable row level security;

drop policy if exists "Public can read publish_state" on public.publish_state;
create policy "Public can read publish_state"
  on public.publish_state for select using (true);

drop policy if exists "Authenticated can update publish_state" on public.publish_state;
create policy "Authenticated can update publish_state"
  on public.publish_state for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
