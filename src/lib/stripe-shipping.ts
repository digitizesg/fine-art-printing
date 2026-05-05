/**
 * Shared helpers for reading shipping data off a Stripe Checkout
 * Session. Pulled out of /api/stripe-webhook so it's importable from
 * tests without dragging in the webhook's Supabase / env-check path.
 */
import type Stripe from "stripe";

/**
 * Pull a shipping address out of a Checkout Session. Tries the modern
 * collected_information.shipping_details path first, then the legacy
 * top-level shipping_details (deprecated but still returned by Stripe),
 * then falls back to the customer's billing address. Returns null if
 * nothing is present.
 */
export function extractShippingAddress(
  session: Stripe.Checkout.Session,
): Stripe.Address | null {
  const collected = session.collected_information?.shipping_details?.address;
  if (collected) return collected;
  // shipping_details was a top-level field on Checkout.Session in
  // pre-2024 API surfaces; the type is no longer in the SDK so we
  // narrow it here without falling back to `any`.
  const legacy = (
    session as unknown as {
      shipping_details?: { address?: Stripe.Address | null } | null;
    }
  ).shipping_details?.address;
  if (legacy) return legacy;
  return session.customer_details?.address ?? null;
}
