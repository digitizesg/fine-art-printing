-- Phase 3a: canvas substrates. Editable from /admin/canvases so we don't
-- need a code change to add or update a canvas. Mirrors the float_frames
-- migration pattern (table + storage bucket + RLS + triggers).
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- =========================================================================
-- canvases table
-- =========================================================================

create table if not exists public.canvases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  name text not null,
  short_name text not null,
  gsm int not null,
  -- "matt" | "smooth-matt" | "high-gloss"
  finish text not null,
  texture text not null,
  tone text not null,
  blurb text not null,
  description text not null,
  long_description text not null,
  sell_price_per_sqm numeric(10,2) not null,
  max_print_width_cm numeric(8,2) not null,
  max_print_length_cm numeric(8,2) not null,
  -- Filenames in the 'canvases' storage bucket; first is the picker thumbnail.
  images jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  published boolean not null default true,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canvases_published_idx
  on public.canvases (published) where published = true;
create index if not exists canvases_featured_idx
  on public.canvases (featured) where featured = true;
create index if not exists canvases_slug_idx
  on public.canvases (slug);

drop trigger if exists canvases_updated_at on public.canvases;
create trigger canvases_updated_at
  before update on public.canvases
  for each row execute function public.set_updated_at();

drop trigger if exists canvases_pending_count on public.canvases;
create trigger canvases_pending_count
  after insert or update or delete on public.canvases
  for each row execute function public.bump_pending_count();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.canvases enable row level security;

drop policy if exists "Public can read published canvases" on public.canvases;
create policy "Public can read published canvases"
  on public.canvases for select
  using (published = true);

drop policy if exists "Authenticated full access canvases" on public.canvases;
create policy "Authenticated full access canvases"
  on public.canvases for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =========================================================================
-- Storage bucket for canvas swatch / showcase photos (public)
-- =========================================================================

insert into storage.buckets (id, name, public)
  values ('canvases', 'canvases', true)
  on conflict (id) do nothing;

drop policy if exists "Public can read canvases bucket" on storage.objects;
create policy "Public can read canvases bucket"
  on storage.objects for select
  using (bucket_id = 'canvases');

drop policy if exists "Authenticated can upload to canvases" on storage.objects;
create policy "Authenticated can upload to canvases"
  on storage.objects for insert
  with check (bucket_id = 'canvases' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update in canvases" on storage.objects;
create policy "Authenticated can update in canvases"
  on storage.objects for update
  using (bucket_id = 'canvases' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete from canvases" on storage.objects;
create policy "Authenticated can delete from canvases"
  on storage.objects for delete
  using (bucket_id = 'canvases' and auth.role() = 'authenticated');
