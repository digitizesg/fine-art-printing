-- Phase 3c: orders table. Captures every checkout attempt + the
-- authoritative paid state once Stripe's webhook confirms the payment.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

-- =========================================================================
-- orders table
-- =========================================================================

-- Sequence + helper need to exist before the table can default to them.
create sequence if not exists public.orders_reference_seq;

create or replace function public.generate_order_reference() returns text as $$
declare
  yr text := to_char(now(), 'YYYY');
  seq int;
begin
  seq := nextval('public.orders_reference_seq');
  return 'FAP-' || yr || '-' || lpad(seq::text, 4, '0');
end;
$$ language plpgsql;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Short, customer-friendly reference (e.g. "FAP-2026-0001"). Generated
  -- by public.generate_order_reference() — see below.
  reference text unique not null default public.generate_order_reference(),

  -- Stripe linkage.
  stripe_session_id text unique not null,
  stripe_payment_intent_id text,

  -- "pending"  — created on /api/checkout, awaiting Stripe redirect.
  -- "paid"     — checkout.session.completed received from Stripe.
  -- "failed"   — payment failed.
  -- "cancelled" — customer abandoned the Stripe page.
  status text not null default 'pending',

  -- Customer details (filled in once Stripe sends the webhook).
  customer_email text,
  customer_name text,
  customer_phone text,

  -- Delivery details captured at checkout.
  delivery_method text not null check (delivery_method in ('self', 'local')),
  shipping_address jsonb,

  -- Money (pre-GST throughout — Ben's policy).
  subtotal_sgd numeric(10,2) not null,
  delivery_sgd numeric(10,2) not null default 0,
  total_sgd numeric(10,2) not null,
  currency text not null default 'SGD',

  -- Full snapshot of what was ordered. Resolved against Supabase catalogs
  -- at checkout time; we keep this in case prices or descriptions change.
  line_items jsonb not null default '[]'::jsonb,

  -- Free-form note we can edit from the admin (production status, etc.).
  internal_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_stripe_session_idx on public.orders (stripe_session_id);
create index if not exists orders_reference_idx on public.orders (reference);

-- Reuse the set_updated_at() function from the publish-state migration.
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS — admin-only. Customers don't read this table directly; the
-- success page is generic. Service-role inserts/updates from the API.
-- =========================================================================

alter table public.orders enable row level security;

drop policy if exists "Authenticated full access orders" on public.orders;
create policy "Authenticated full access orders"
  on public.orders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- The /api/checkout and /api/stripe-webhook endpoints use the service role
-- key, which bypasses RLS — no public policy is needed.
