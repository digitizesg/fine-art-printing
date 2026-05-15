/**
 * Helpers for building Schema.org JSON-LD blocks. Pages compose these
 * into the `jsonLd` prop on BaseLayout, which serialises them into the
 * <head>. Always pass arrays when combining multiple types so Google
 * picks them all up.
 */
import { business } from "../data/business";
import reviewsData from "../data/reviews.json";

const SITE_URL = `https://${business.domain}`;
const ORG_ID = `${SITE_URL}#organization`;

/**
 * Stable LocalBusiness + Organization graph node. The dual @type is
 * deliberate: LocalBusiness is what Google requires for the
 * aggregateRating star snippet to surface in organic results, while
 * Organization keeps the entity wired up across page references
 * (`provider`, `brand`, `publisher`). Star display is best-effort —
 * Google can choose to ignore aggregateRating — but we still
 * publish it because our reviews are strong.
 */
const aggregateRating =
  reviewsData?.rating && reviewsData?.userRatingsTotal
    ? {
        "@type": "AggregateRating",
        ratingValue: Number(reviewsData.rating).toFixed(1),
        reviewCount: reviewsData.userRatingsTotal,
        bestRating: "5",
        worstRating: "1",
      }
    : undefined;

// Map business.hours into Schema's OpeningHoursSpecification.
const openingHoursSpecification = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:00",
    closes: "18:00",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: "Saturday",
    opens: "10:00",
    closes: "17:00",
  },
];

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": ORG_ID,
  name: business.name,
  legalName: business.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/og-default.jpg`,
  image: `${SITE_URL}/og-default.jpg`,
  email: business.contactEmail,
  telephone: business.phone,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: `${business.address.line2} ${business.address.line3}`,
    addressLocality: "Singapore",
    postalCode: business.address.postcode.replace(/^Singapore\s*/, ""),
    addressCountry: "SG",
  },
  openingHoursSpecification,
  ...(aggregateRating ? { aggregateRating } : {}),
  sameAs: [business.googleReviewsUrl],
};

export interface FaqEntry {
  q: string;
  a: string;
}

/**
 * Build a FAQPage schema from a list of FAQs. Use on any service page
 * with a visible Q&A block — Google may surface the questions as
 * expandable rich snippets in SERPs.
 */
export function faqPageSchema(faqs: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export interface BreadcrumbCrumb {
  name: string;
  url?: string;
}

/**
 * Build a BreadcrumbList schema from a path of crumbs. The last crumb
 * is the current page (no URL needed). All earlier crumbs should
 * include a URL relative-or-absolute (we resolve relative paths to
 * the site origin).
 */
export function breadcrumbSchema(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.url
        ? {
            item: c.url.startsWith("http") ? c.url : `${SITE_URL}${c.url.startsWith("/") ? "" : "/"}${c.url}`,
          }
        : {}),
    })),
  };
}
