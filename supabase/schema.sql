-- Fine Art Printing — Phase 2 schema
-- Paste into Supabase Studio → SQL Editor → New Query → Run.
-- Idempotent where possible; safe to re-run if you tweak.

-- =========================================================================
-- frame_examples table
-- =========================================================================

create table if not exists public.frame_examples (
  id uuid primary key default gen_random_uuid(),

  -- Top-level service categorisation
  service text not null check (service in ('custom-framing', 'canvas-printing', 'canvas-stretching')),

  -- Subject of the framed/printed work
  subject text not null check (subject in ('photo-colour', 'photo-bw', 'artwork', 'illustration', 'document', 'memorabilia')),

  -- Optional one-line caption shown in the lightbox
  caption text,

  -- Promote to the per-service featured strip on the marketing site
  featured boolean not null default false,

  -- Custom-framing-only: matches picture frame profile id on /custom-framing
  picture_frame_id text,

  -- Canvas-only (printing or stretching): float frame surrounding the canvas, if any
  float_frame_id text,
  stretching_depth text check (stretching_depth in ('1in', '1.5in')),

  -- Canvas-printing-only: which canvas substrate
  canvas_id text,

  -- Storage path within the 'frame-examples' bucket (e.g. "abc123.jpg")
  image_path text not null,

  -- Optional manual ordering
  display_order int not null default 0,

  -- Tracking
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frame_examples_service_idx on public.frame_examples (service);
create index if not exists frame_examples_featured_idx on public.frame_examples (featured) where featured = true;

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists frame_examples_updated_at on public.frame_examples;
create trigger frame_examples_updated_at
  before update on public.frame_examples
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Row level security
-- =========================================================================

alter table public.frame_examples enable row level security;

drop policy if exists "Public can read frame_examples" on public.frame_examples;
create policy "Public can read frame_examples"
  on public.frame_examples for select
  using (true);

drop policy if exists "Authenticated full access frame_examples" on public.frame_examples;
create policy "Authenticated full access frame_examples"
  on public.frame_examples for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =========================================================================
-- Storage bucket for example photos
-- =========================================================================

insert into storage.buckets (id, name, public)
  values ('frame-examples', 'frame-examples', true)
  on conflict (id) do nothing;

drop policy if exists "Public can read frame-examples bucket" on storage.objects;
create policy "Public can read frame-examples bucket"
  on storage.objects for select
  using (bucket_id = 'frame-examples');

drop policy if exists "Authenticated can upload to frame-examples" on storage.objects;
create policy "Authenticated can upload to frame-examples"
  on storage.objects for insert
  with check (bucket_id = 'frame-examples' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update in frame-examples" on storage.objects;
create policy "Authenticated can update in frame-examples"
  on storage.objects for update
  using (bucket_id = 'frame-examples' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete from frame-examples" on storage.objects;
create policy "Authenticated can delete from frame-examples"
  on storage.objects for delete
  using (bucket_id = 'frame-examples' and auth.role() = 'authenticated');
