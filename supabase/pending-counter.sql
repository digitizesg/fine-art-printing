-- Track pending changes via a counter that's bumped by triggers on the
-- frame_examples table — covers inserts, updates, AND deletes (the
-- previous "max(updated_at)" approach missed deletes).
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- 1. Counter column.
alter table public.publish_state
  add column if not exists pending_count int not null default 0;

-- 2. Bump function.
create or replace function public.bump_pending_count() returns trigger as $$
begin
  update public.publish_state
     set pending_count = pending_count + 1
   where id = 1;
  return null;
end;
$$ language plpgsql security definer;

-- 3. Trigger on frame_examples.
drop trigger if exists frame_examples_pending_count on public.frame_examples;
create trigger frame_examples_pending_count
  after insert or update or delete on public.frame_examples
  for each row execute function public.bump_pending_count();

-- 4. Backfill: assume some pending work since we don't know the prior state.
update public.publish_state set pending_count = 0 where id = 1;
