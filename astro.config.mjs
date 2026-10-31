// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fineartprinting.com.sg',
  // 'server' default + per-page prerender:true keeps marketing pages static
  // (great for SEO and CDN caching) while admin/* pages run server-side.
  output: 'server',
  adapter: vercel({
    imageService: true,
    // Vercel only serves widths listed in `sizes` (anything else is
    // snapped to the nearest one). The small widths cover thumbnails;
    // `formats` lets Vercel hand AVIF to browsers that accept it and
    // WebP to the rest (Vercel's default is WebP only).
    imagesConfig: {
      sizes: [128, 256, 320, 384, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      formats: ['image/avif', 'image/webp'],
      // Must be repeated here: once imagesConfig is set, the adapter
      // drops image.remotePatterns entries that carry a protocol.
      remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
    },
  }),
  integrations: [
    sitemap({
      // Keep admin / transactional pages out of the public sitemap so
      // search engines don't crawl or index them. robots.txt also
      // disallows these paths but the sitemap is the more authoritative
      // signal for what we want indexed.
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/cart") &&
        !page.includes("/checkout") &&
        !page.includes("/make-payment"),
    }),
  ],
  image: {
    remotePatterns: [
      // Supabase storage hosts article heroes, frame examples, paper /
      // canvas detail photos. Whitelist any *.supabase.co subdomain so
      // <Image src="https://...supabase.co/..."> goes through Vercel's
      // image optimiser (AVIF / WebP, srcset, lazy-decode, edge cache).
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
