/**
 * Build-only memoization for Supabase reads.
 *
 * Astro renders ~80 prerendered pages during a single Vercel build.
 * Many of them call listPapers / listCanvases / listFloatFrames /
 * listArtworks in their frontmatter — without caching, that's a
 * network round-trip per page per call. Memoizing for the build
 * collapses it to one fetch each.
 *
 * Important: only active during `npm run build`. The same module is
 * shared by SSR-mode admin pages (prerender = false) where we
 * absolutely need fresh data on every request. We detect via
 * `npm_lifecycle_event` which npm sets to "build" when a `build`
 * script is running, and is undefined at runtime in a Vercel
 * serverless function.
 */

const isBuild = process.env.npm_lifecycle_event === "build";
const cache = new Map<string, Promise<unknown>>();

/**
 * Memoize an async fetch by string key for the duration of the
 * build. At runtime (admin requests) it's a no-op pass-through.
 */
export function buildMemo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!isBuild) return fn();
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn();
  cache.set(key, p);
  return p;
}
