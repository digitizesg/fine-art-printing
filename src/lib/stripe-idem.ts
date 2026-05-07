import { createHash } from "node:crypto";

/**
 * Build a Stripe idempotency key from a deterministic input.
 *
 * Stripe accepts any unique string up to 255 chars and dedupes
 * checkout.sessions.create calls that arrive with the same key within
 * a 24-hour window — so a double-clicked submit returns the original
 * session URL instead of creating two pending orders.
 *
 * We bucket by hour: identical carts submitted within ~1 hour collapse
 * to one Stripe session, but if the customer comes back later (e.g.
 * the next day) they get a fresh one. Without bucketing, a stale
 * cancelled/expired session URL would be returned forever.
 */
export function idempotencyKey(scope: string, parts: unknown): string {
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const payload = JSON.stringify({ scope, parts, hourBucket });
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 40);
  return `${scope}_${hash}`;
}
