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
