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

-- =========================================================================
-- Seed: the five reviews currently in src/data/featured-reviews.json.
-- Safe to re-run; on conflict do nothing keeps existing rows untouched.
-- =========================================================================

insert into public.featured_reviews
  (author_name, author_url, profile_photo_url, rating, body, review_date, display_order)
values
  (
    'Aaron Lim',
    'https://search.google.com/local/reviews?placeid=ChIJke7_b1gZ2jERBZIUs8hiUJE',
    null,
    5,
    'Ben and his team did a beautiful job printing and framing a set of archival prints for my wife''s 50th. Colour was spot on, paper was beautiful, and they gave honest advice about which sizes worked. Will be back.',
    '2026-03-14',
    100
  ),
  (
    'Priya Subramaniam',
    'https://search.google.com/local/reviews?placeid=ChIJke7_b1gZ2jERBZIUs8hiUJE',
    null,
    5,
    'Excellent attention to detail. We had four large pieces printed on Hahnemühle paper and stretched on canvas for our office reception. Crisp, neutral, and finished on schedule. The team walked us through paper choices without overselling.',
    '2025-12-12',
    100
  ),
  (
    'Marcus Tan',
    'https://search.google.com/local/reviews?placeid=ChIJke7_b1gZ2jERBZIUs8hiUJE',
    null,
    5,
    'Took my late father''s photographs in for restoration and reprinting. The work they did to bring back damaged sections was extraordinary. Beautifully framed too. Thank you.',
    '2025-09-04',
    100
  ),
  (
    'Hannah Goh',
    'https://search.google.com/local/reviews?placeid=ChIJke7_b1gZ2jERBZIUs8hiUJE',
    null,
    5,
    'Best printing experience I''ve had in Singapore. Studio is calm, the team actually looks at your file before printing, and they pulled a test print before running the full size. Pricing felt fair for the quality.',
    '2025-06-08',
    100
  ),
  (
    'Jonathan Wee',
    'https://search.google.com/local/reviews?placeid=ChIJke7_b1gZ2jERBZIUs8hiUJE',
    null,
    5,
    'Used them for a corporate gifting project, 30 framed prints across two offices. Quality was uniform across the run, deliveries were on time, and the framing options matched our brand without us having to over-specify. Recommended.',
    '2025-01-31',
    100
  )
on conflict do nothing;
