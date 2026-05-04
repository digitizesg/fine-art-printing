-- Phase 3a: float frame profiles. Editable from /admin/float-frames so we
-- don't need a code change to add a new moulding (e.g. the recent "Gold").
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- =========================================================================
-- float_frames table
-- =========================================================================

create table if not exists public.float_frames (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  cost_per_foot numeric(8,3) not null,
  -- Filename in the 'float-frames' storage bucket. Nullable so we can ship
  -- a profile before we have the swatch photo.
  image_path text,

  published boolean not null default true,
  display_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists float_frames_published_idx
  on public.float_frames (published) where published = true;
create index if not exists float_frames_display_order_idx
  on public.float_frames (display_order);

-- Reuse the existing set_updated_at() function from publish-state.sql.
drop trigger if exists float_frames_updated_at on public.float_frames;
create trigger float_frames_updated_at
  before update on public.float_frames
  for each row execute function public.set_updated_at();

-- Bump pending_count on any change so the marketing-site Publish button
-- surfaces float-frame edits alongside frame-examples and artworks.
drop trigger if exists float_frames_pending_count on public.float_frames;
create trigger float_frames_pending_count
  after insert or update or delete on public.float_frames
  for each row execute function public.bump_pending_count();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.float_frames enable row level security;

drop policy if exists "Public can read published float_frames" on public.float_frames;
create policy "Public can read published float_frames"
  on public.float_frames for select
  using (published = true);

drop policy if exists "Authenticated full access float_frames" on public.float_frames;
create policy "Authenticated full access float_frames"
  on public.float_frames for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =========================================================================
-- Storage bucket for swatch photos (public)
-- =========================================================================

insert into storage.buckets (id, name, public)
  values ('float-frames', 'float-frames', true)
  on conflict (id) do nothing;

drop policy if exists "Public can read float-frames bucket" on storage.objects;
create policy "Public can read float-frames bucket"
  on storage.objects for select
  using (bucket_id = 'float-frames');

drop policy if exists "Authenticated can upload to float-frames" on storage.objects;
create policy "Authenticated can upload to float-frames"
  on storage.objects for insert
  with check (bucket_id = 'float-frames' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update in float-frames" on storage.objects;
create policy "Authenticated can update in float-frames"
  on storage.objects for update
  using (bucket_id = 'float-frames' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete from float-frames" on storage.objects;
create policy "Authenticated can delete from float-frames"
  on storage.objects for delete
  using (bucket_id = 'float-frames' and auth.role() = 'authenticated');
