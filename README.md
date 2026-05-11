# Fine Art Printing

Marketing site, online quote calculators, shop, and admin dashboard for
[fineartprinting.com.sg](https://fineartprinting.com.sg). Astro 6,
deployed on Vercel.

## Stack

- **Astro 6** (SSG + Vercel server adapter)
- **TypeScript (strict)**
- **Tailwind v4** (via `@tailwindcss/vite`)
- **Supabase** for artworks / papers / canvases / orders / float frames + admin auth
- **Stripe** for shop checkout
- **Resend** for contact form notifications
- **Google Places API** for live reviews (refreshed every deploy)

## Repo layout

```
src/
  components/   shared UI (calculators, recommenders, cards, layouts)
  data/         pricing logic (paper.ts, canvas.ts), business.ts, reviews.json
  lib/          Supabase clients, schema helpers, types
  pages/        Astro routes
    api/        serverless routes (contact, checkout, stripe webhook, valuation)
    admin/      Supabase-auth-gated admin tree
    shop/       /shop, /shop/[slug] (Stripe checkout)
    print-on-paper.astro, print-on-canvas.astro, canvas-stretching.astro, ...
public/         static assets (photos, logos, og-default.jpg)
scripts/        refresh-reviews.mjs (prebuild hook)
tests/          Vitest unit tests for pricing + stripe webhook
```

## Local development

```sh
npm install
cp .env.example .env       # fill in the keys you need
npm run dev                # astro dev on :4321
npm run build              # production build (also runs prebuild reviews script)
npm test                   # Vitest
```

The site builds cleanly without any env vars, so you can develop UI and
copy locally without a Supabase project or Stripe key. Calls that need
them (`/api/checkout`, `/admin`, etc.) will simply fail at runtime.

## Environment variables

Set in Vercel per environment. Local dev reads from `.env`.

| Variable | Used for |
|---|---|
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase (admin auth) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase (admin reads, contact-form storage) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Shop checkout and webhook |
| `RESEND_API_KEY` | Contact + valuation + order notifications |
| `GOOGLE_PLACES_API_KEY` | Live reviews refresh on every deploy |
| `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile on contact form |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated emails permitted to log into `/admin` |

## Pricing

Paper + canvas pricing lives in `src/data/pricing/paper.ts` and
`canvas.ts`. The same V6 formula drives the public quote calculator and
shop variant pricing:

```
per-print = paper $/sqm × sqm
          + 11.25 × sqm           (ink)
          + 20.00                 (studio labour)
          + 28.00 × tier1(sqm)    (0.3 to 1.0 sqm size surcharge)
          + 40.00 × tier2(sqm)    (above 1.0 sqm size surcharge)
total     = max(per-print × qty, 30.00)
```

GST is never displayed anywhere on the site (preference: prices are
shown pre-GST and final). Substrate roll caps live on each paper/canvas
row; if the requested print exceeds the largest roll, the calculator
refuses to quote.

## Reviews

`scripts/refresh-reviews.mjs` runs as a `prebuild` hook on every Vercel
deploy. It fetches the latest 5 Google reviews from the Places API and
writes `src/data/reviews.json`. If `GOOGLE_PLACES_API_KEY` is missing or
the API call fails, the existing JSON is kept untouched so the build
never breaks.

Live reviews drive the aggregate rating + total review count. The
testimonial card grid filters to 5-star only (see
`src/components/ReviewSection.astro`).

## Stripe webhook

Stripe events post to `/api/stripe-webhook`. Webhook signing secret in
`STRIPE_WEBHOOK_SECRET`. Register the endpoint in the Stripe dashboard
pointing at `https://fineartprinting.com.sg/api/stripe-webhook` and
subscribe to `checkout.session.completed` and
`payment_intent.payment_failed`.

## Supabase

Migrations live in `supabase/migrations/`. Apply with the Supabase CLI
or paste into the SQL editor. The site reads from these tables:

- `papers`, `canvases`, `float_frames`, `picture_frames` — substrate
  catalog. Admin CRUD at `/admin/papers`, `/admin/canvases`, etc.
- `artworks` — public shop listings; admin CRUD at `/admin/artworks`.
- `frame_examples` — gallery of stretched / framed pieces shown across
  the configurators.
- `orders`, `order_items` — Stripe checkout output. Admin view at
  `/admin/orders`.
- `valuations` — submissions from `/art-valuation/submit`.
- `contact_submissions` — submissions from `/contact`.

## Brand voice

- British spelling, sentence case headings, no em-dashes in customer
  copy (commas, periods, or pipes instead).
- The studio is repositioned around businesses + private homes in
  Singapore. Lead with corporate fit-outs and home decor in marketing
  copy; artists/photographers are a secondary audience.
- Two strongest differentiators: Hahnemühle Gold-certified studio
  (only one in Singapore) and Canon Pro-566 with manufacturer inks.
