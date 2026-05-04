/**
 * Client-side cart for the artwork shop.
 *
 * Lives in localStorage as a JSON-serialised array of line items. Each line
 * captures everything needed to (a) display the cart row and (b) re-resolve
 * the configuration server-side at checkout time. Prices stored on the line
 * are a snapshot for display only — the checkout endpoint recomputes the
 * authoritative total from the engine before creating the Stripe session.
 */

export type CartSubstrate = "paper" | "canvas";
export type CartFinishing = "none" | "1in" | "1.5in" | "float";
export type CartWrapType = "mirror" | "gallery" | "colour";

export interface CartLine {
  /** Local identifier for this cart line. Not the artwork id. */
  id: string;
  /** Artwork id (uuid in Supabase) — kept for reference. */
  artworkId: string;
  artworkSlug: string;
  artworkTitle: string;
  artworkArtist?: string | null;
  artworkImageUrl: string;
  substrate: CartSubstrate;
  /** Size in cm (image dimensions, before any wrap allowance). */
  widthCm: number;
  heightCm: number;
  /** Optional human label that came with the size, e.g. "Small". */
  sizeLabel?: string | null;
  quantity: number;
  /** Snapshot of unit price in SGD whole dollars. Display only. */
  unitPriceSGD: number;

  // Paper-specific
  paperSlug?: string;
  borderCm?: number;

  // Canvas-specific
  canvasSlug?: string;
  finishing?: CartFinishing;
  floatFrameSlug?: string | null;
  futureMargin?: boolean;
  wrapType?: CartWrapType;
}

const STORAGE_KEY = "fap-cart-v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function read(): CartLine[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartLine[];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("fap-cart-changed", { detail: { count: count(lines) } }));
}

function count(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

function makeId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const cart = {
  list(): CartLine[] {
    return read();
  },
  count(): number {
    return count(read());
  },
  subtotal(): number {
    return read().reduce((s, l) => s + l.unitPriceSGD * l.quantity, 0);
  },
  add(line: Omit<CartLine, "id">): CartLine {
    const lines = read();
    const next: CartLine = { ...line, id: makeId() };
    lines.push(next);
    write(lines);
    return next;
  },
  remove(id: string): void {
    write(read().filter((l) => l.id !== id));
  },
  update(id: string, patch: Partial<Omit<CartLine, "id">>): void {
    write(read().map((l) => (l.id === id ? { ...l, ...patch } : l)));
  },
  clear(): void {
    write([]);
  },
  /** Subscribe to cart-changed events. Returns an unsubscribe fn. */
  onChange(fn: (count: number) => void): () => void {
    if (!isBrowser()) return () => {};
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      fn(detail?.count ?? cart.count());
    };
    window.addEventListener("fap-cart-changed", handler as EventListener);
    return () => window.removeEventListener("fap-cart-changed", handler as EventListener);
  },
};
