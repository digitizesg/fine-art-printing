-- Phase 3a: artworks catalog. Sellable images that get printed on paper or
-- canvas at a customer-chosen size. High-res print masters live in Dropbox;
-- this table only stores hero/preview metadata.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- =========================================================================
-- artworks table
-- =========================================================================

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  artist_name text,
  description text,

  -- Filename in the 'artworks' storage bucket (preview only, not the print master)
  hero_image_path text not null,

  -- Sizes the artist/admin allows for this artwork.
  -- Shape: [{ "width_cm": 30, "height_cm": 40, "label": "Small" }, ...]
  available_sizes jsonb not null default '[]'::jsonb,

  -- Which substrates this can be printed on
  allow_paper boolean not null default true,
  allow_canvas boolean not null default false,

  -- Display flags
  published boolean not null default false,
  featured boolean not null default false,
  display_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artworks_published_idx
  on public.artworks (published) where published = true;
create index if not exists artworks_featured_idx
  on public.artworks (featured) where featured = true;
create index if not exists artworks_slug_idx
  on public.artworks (slug);

-- Reuse the existing set_updated_at() function from the publish-state migration.
drop trigger if exists artworks_updated_at on public.artworks;
create trigger artworks_updated_at
  before update on public.artworks
  for each row execute function public.set_updated_at();

-- Bump pending_count on any artwork change too, so the marketing-site
-- Publish button surfaces both frame-example and artwork changes together.
drop trigger if exists artworks_pending_count on public.artworks;
create trigger artworks_pending_count
  after insert or update or delete on public.artworks
  for each row execute function public.bump_pending_count();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.artworks enable row level security;

drop policy if exists "Public can read published artworks" on public.artworks;
create policy "Public can read published artworks"
  on public.artworks for select
  using (published = true);

drop policy if exists "Authenticated full access artworks" on public.artworks;
create policy "Authenticated full access artworks"
  on public.artworks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =========================================================================
-- Storage bucket for artwork hero images (preview-resolution, public)
-- =========================================================================

insert into storage.buckets (id, name, public)
  values ('artworks', 'artworks', true)
  on conflict (id) do nothing;

drop policy if exists "Public can read artworks bucket" on storage.objects;
create policy "Public can read artworks bucket"
  on storage.objects for select
  using (bucket_id = 'artworks');

drop policy if exists "Authenticated can upload to artworks" on storage.objects;
create policy "Authenticated can upload to artworks"
  on storage.objects for insert
  with check (bucket_id = 'artworks' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update in artworks" on storage.objects;
create policy "Authenticated can update in artworks"
  on storage.objects for update
  using (bucket_id = 'artworks' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete from artworks" on storage.objects;
create policy "Authenticated can delete from artworks"
  on storage.objects for delete
  using (bucket_id = 'artworks' and auth.role() = 'authenticated');
