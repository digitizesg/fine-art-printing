-- Featured Google reviews shown in the testimonial wall on every page.
-- Curated in /admin/featured-reviews because Google's Places API returns
-- relevance-ranked reviews with no date sort, so we can't reliably surface
-- the newest five via the API. Aggregate rating + total review count are
-- still pulled live from Google on every deploy.
--
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- =========================================================================
-- featured_reviews table
-- =========================================================================

create table if not exists public.featured_reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_url text not null,
  profile_photo_url text,
  rating int not null check (rating between 1 and 5),
  body text not null,
  review_date date not null,

  published boolean not null default true,
  display_order int not null default 100,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists featured_reviews_published_idx
  on public.featured_reviews (published) where published = true;
create index if not exists featured_reviews_display_order_idx
  on public.featured_reviews (display_order);
create index if not exists featured_reviews_review_date_idx
  on public.featured_reviews (review_date desc);

-- Reuse the existing set_updated_at() function from publish-state.sql.
drop trigger if exists featured_reviews_updated_at on public.featured_reviews;
create trigger featured_reviews_updated_at
  before update on public.featured_reviews
  for each row execute function public.set_updated_at();

-- Bump pending_count on any change so the admin Publish button surfaces
-- featured-review edits alongside artworks / float-frames / etc.
drop trigger if exists featured_reviews_pending_count on public.featured_reviews;
create trigger featured_reviews_pending_count
  after insert or update or delete on public.featured_reviews
  for each row execute function public.bump_pending_count();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.featured_reviews enable row level security;

drop policy if exists "Public can read published featured_reviews" on public.featured_reviews;
create policy "Public can read published featured_reviews"
  on public.featured_reviews for select
  using (published = true);

drop policy if exists "Authenticated full access featured_reviews" on public.featured_reviews;
create policy "Authenticated full access featured_reviews"
  on public.featured_reviews for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- No seed data. The site falls back to whatever the latest Google API call
-- returned (src/data/reviews.json, refreshed every deploy) if the table is
-- empty, so the testimonial wall is never blank. You curate the wall by
-- featuring reviews from /admin/featured-reviews.
