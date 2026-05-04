-- Phase 3a: paper substrates. Editable from /admin/papers so we don't need
-- a code change to add or update a paper. Mirrors the canvases migration.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- =========================================================================
-- papers table
-- =========================================================================

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  name text not null,
  short_name text not null,
  gsm int not null,
  -- "matt" | "gloss" | "high-gloss" | "pearl" | "satin" | "silk-gloss" | "metallic"
  finish text not null,
  tone text not null,
  texture text not null,
  -- "delicate" | "good" | "high"
  durability text not null,
  blurb text not null,
  description text not null,
  long_description text not null,
  -- ["colour-photo" | "bw-photo" | "original-art" | "illustration"]
  best_for jsonb not null default '[]'::jsonb,
  sell_price_per_sqm numeric(10,2) not null,
  max_print_width_cm numeric(8,2) not null,
  max_print_length_cm numeric(8,2) not null,
  -- Filenames in the 'papers' storage bucket; first is the picker swatch.
  images jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  published boolean not null default true,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists papers_published_idx
  on public.papers (published) where published = true;
create index if not exists papers_featured_idx
  on public.papers (featured) where featured = true;
create index if not exists papers_slug_idx
  on public.papers (slug);

drop trigger if exists papers_updated_at on public.papers;
create trigger papers_updated_at
  before update on public.papers
  for each row execute function public.set_updated_at();

drop trigger if exists papers_pending_count on public.papers;
create trigger papers_pending_count
  after insert or update or delete on public.papers
  for each row execute function public.bump_pending_count();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.papers enable row level security;

drop policy if exists "Public can read published papers" on public.papers;
create policy "Public can read published papers"
  on public.papers for select
  using (published = true);

drop policy if exists "Authenticated full access papers" on public.papers;
create policy "Authenticated full access papers"
  on public.papers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =========================================================================
-- Storage bucket for paper swatch / showcase photos (public)
-- =========================================================================

insert into storage.buckets (id, name, public)
  values ('papers', 'papers', true)
  on conflict (id) do nothing;

drop policy if exists "Public can read papers bucket" on storage.objects;
create policy "Public can read papers bucket"
  on storage.objects for select
  using (bucket_id = 'papers');

drop policy if exists "Authenticated can upload to papers" on storage.objects;
create policy "Authenticated can upload to papers"
  on storage.objects for insert
  with check (bucket_id = 'papers' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update in papers" on storage.objects;
create policy "Authenticated can update in papers"
  on storage.objects for update
  using (bucket_id = 'papers' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete from papers" on storage.objects;
create policy "Authenticated can delete from papers"
  on storage.objects for delete
  using (bucket_id = 'papers' and auth.role() = 'authenticated');
