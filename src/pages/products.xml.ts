/**
 * Google Merchant Center product feed.
 *
 * Submit the public URL (https://<domain>/products.xml) under
 * Merchant Center → Products → Feeds. Google fetches on a schedule
 * (default daily) and ingests every <item> as a product listing.
 *
 * Variants of the same artwork share an item_group_id so Google
 * groups them together as a configurable product. Each variant
 * carries a unique id (artwork-slug--substrate-WxH) and a link
 * with substrate + size query params so the product page lands
 * on the right configuration.
 *
 * identifier_exists=no tells Google we don't have GTIN/MPN — fine
 * for made-to-order prints.
 */
import type { APIRoute } from "astro";
import { listArtworks } from "../lib/artworks";
import { listPapers } from "../lib/papers";
import { listCanvases } from "../lib/canvases";
import {
  buildShopVariants,
  variantSku,
  variantTitle,
  variantUrl,
  type ShopVariant,
} from "../lib/shop-variants";
import { business } from "../data/business";

export const prerender = true;

const SITE_ORIGIN = `https://${business.domain}`;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  // CDATA-wrap free-text fields so Google parsers don't choke on
  // stray characters or copy-pasted curly quotes.
  return `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function renderItem(args: {
  artworkSlug: string;
  artworkTitle: string;
  artworkDescription: string | null;
  artistName: string | null;
  heroImageUrl: string;
  variant: ShopVariant;
}): string {
  const { artworkSlug, artworkTitle, artworkDescription, artistName, heroImageUrl, variant } = args;
  const sku = variantSku(artworkSlug, variant);
  const title = variantTitle(artworkTitle, variant);
  const description =
    artworkDescription?.trim() ||
    `${artworkTitle}${artistName ? ` by ${artistName}` : ""}, printed to order on archival ${variant.substrate} at Fine Art Printing in Singapore.`;
  const link = variantUrl(SITE_ORIGIN, artworkSlug, variant);
  const priceStr = `${variant.price.toFixed(2)} SGD`;

  return [
    "    <item>",
    `      <g:id>${escapeXml(sku)}</g:id>`,
    `      <g:title>${cdata(title)}</g:title>`,
    `      <g:description>${cdata(description)}</g:description>`,
    `      <g:link>${escapeXml(link)}</g:link>`,
    `      <g:image_link>${escapeXml(heroImageUrl)}</g:image_link>`,
    "      <g:availability>in_stock</g:availability>",
    `      <g:price>${escapeXml(priceStr)}</g:price>`,
    `      <g:brand>${escapeXml(business.name)}</g:brand>`,
    "      <g:condition>new</g:condition>",
    "      <g:identifier_exists>no</g:identifier_exists>",
    `      <g:item_group_id>${escapeXml(artworkSlug)}</g:item_group_id>`,
    "      <g:google_product_category>500045</g:google_product_category>",
    "      <g:product_type>Home &amp; Garden &gt; Decor &gt; Artwork &gt; Posters, Prints, &amp; Visual Artwork</g:product_type>",
    `      <g:material>${variant.substrate === "paper" ? "Archival paper" : "Canvas"}</g:material>`,
    `      <g:size>${variant.width_cm}x${variant.height_cm} cm</g:size>`,
    `      <g:mpn>${escapeXml(sku)}</g:mpn>`,
    "      <g:shipping>",
    "        <g:country>SG</g:country>",
    "      </g:shipping>",
    "    </item>",
  ].join("\n");
}

export const GET: APIRoute = async () => {
  const [artworks, papers, canvases] = await Promise.all([
    listArtworks({ onlyPublished: true }),
    listPapers(),
    listCanvases(),
  ]);
  const featuredPapers = papers.filter((p) => p.featured);
  const featuredCanvases = canvases.filter((c) => c.featured);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">');
  lines.push("  <channel>");
  lines.push(`    <title>${escapeXml(business.name)}</title>`);
  lines.push(`    <link>${escapeXml(SITE_ORIGIN)}/shop</link>`);
  lines.push(
    `    <description>${escapeXml("Made-to-order archival fine art prints, printed and finished in Singapore.")}</description>`,
  );
  lines.push(`    <language>en-SG</language>`);
  lines.push(`    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`);

  for (const artwork of artworks) {
    const variants = buildShopVariants({
      artwork,
      featuredPapers,
      featuredCanvases,
    });
    for (const variant of variants) {
      lines.push(
        renderItem({
          artworkSlug: artwork.slug,
          artworkTitle: artwork.title,
          artworkDescription: artwork.description,
          artistName: artwork.artistName,
          heroImageUrl: artwork.heroImageUrl,
          variant,
        }),
      );
    }
  }

  lines.push("  </channel>");
  lines.push("</rss>");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
