-- Trigger a Vercel rebuild whenever frame_examples changes.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

create extension if not exists pg_net;

-- The function calls the Vercel deploy hook, which queues a fresh build.
-- `for each statement` so a bulk insert/update fires once, not N times.
create or replace function public.notify_vercel_rebuild() returns trigger as $$
begin
  perform net.http_post(
    url := 'https://api.vercel.com/v1/integrations/deploy/prj_UH8o9YHDMp4YWNHqCtyebebPT7eI/2PaDXf6lgk',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists frame_examples_rebuild on public.frame_examples;
create trigger frame_examples_rebuild
  after insert or update or delete on public.frame_examples
  for each statement execute function public.notify_vercel_rebuild();
