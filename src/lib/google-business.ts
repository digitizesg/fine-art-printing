/**
 * Google Business Profile API client for fetching the full review list.
 *
 * The public Places API caps reviews at 5 (relevance-sorted). To get the
 * full list we use the OAuth-authed Business Profile v4 reviews endpoint.
 * v4 is technically deprecated but Google has not shipped a v1 replacement
 * for the reviews resource as of writing, and the v4 endpoint still works.
 *
 * Required env vars (see docs/google-business-setup.md):
 *   GOOGLE_BUSINESS_CLIENT_ID
 *   GOOGLE_BUSINESS_CLIENT_SECRET
 *   GOOGLE_BUSINESS_REFRESH_TOKEN
 *   GOOGLE_BUSINESS_ACCOUNT_ID
 *   GOOGLE_BUSINESS_LOCATION_ID
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";

const STAR_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export interface BusinessProfileReview {
  reviewId: string;
  authorName: string;
  profilePhotoUrl: string | null;
  rating: number;
  body: string;
  createTime: string; // ISO 8601
}

export interface BusinessProfileFetchResult {
  ok: boolean;
  reviews: BusinessProfileReview[];
  error?: string;
}

function envOrNull(key: string): string | null {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function isBusinessProfileConfigured(): boolean {
  return Boolean(
    envOrNull("GOOGLE_BUSINESS_CLIENT_ID") &&
      envOrNull("GOOGLE_BUSINESS_CLIENT_SECRET") &&
      envOrNull("GOOGLE_BUSINESS_REFRESH_TOKEN") &&
      envOrNull("GOOGLE_BUSINESS_ACCOUNT_ID") &&
      envOrNull("GOOGLE_BUSINESS_LOCATION_ID"),
  );
}

async function getAccessToken(): Promise<string | null> {
  const clientId = envOrNull("GOOGLE_BUSINESS_CLIENT_ID");
  const clientSecret = envOrNull("GOOGLE_BUSINESS_CLIENT_SECRET");
  const refreshToken = envOrNull("GOOGLE_BUSINESS_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(
      "[google-business] token exchange failed",
      res.status,
      errText.slice(0, 200),
    );
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function fetchAllBusinessProfileReviews(): Promise<BusinessProfileFetchResult> {
  if (!isBusinessProfileConfigured()) {
    return {
      ok: false,
      reviews: [],
      error:
        "Google Business Profile credentials are not set. See docs/google-business-setup.md.",
    };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      reviews: [],
      error:
        "Could not exchange the refresh token for an access token. Check that the refresh token in GOOGLE_BUSINESS_REFRESH_TOKEN is still valid.",
    };
  }

  const accountId = envOrNull("GOOGLE_BUSINESS_ACCOUNT_ID");
  const locationId = envOrNull("GOOGLE_BUSINESS_LOCATION_ID");
  const baseUrl = `${REVIEWS_BASE}/accounts/${accountId}/locations/${locationId}/reviews`;

  const all: BusinessProfileReview[] = [];
  let pageToken: string | null = null;

  // Hard cap: 20 pages × 50 reviews = 1000, plenty for any small business.
  for (let i = 0; i < 20; i++) {
    const url = new URL(baseUrl);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        reviews: all,
        error: `Google API returned ${res.status}. ${errText.slice(0, 400)}`,
      };
    }

    const data = (await res.json()) as {
      reviews?: Array<{
        reviewId?: string;
        name?: string;
        reviewer?: { displayName?: string; profilePhotoUrl?: string };
        starRating?: string;
        comment?: string;
        createTime?: string;
      }>;
      nextPageToken?: string;
    };

    for (const r of data.reviews ?? []) {
      const reviewId = r.reviewId ?? r.name?.split("/").pop() ?? "";
      if (!reviewId) continue;
      all.push({
        reviewId,
        authorName: r.reviewer?.displayName ?? "Anonymous",
        profilePhotoUrl: r.reviewer?.profilePhotoUrl ?? null,
        rating: STAR_MAP[r.starRating ?? ""] ?? 0,
        body: r.comment ?? "",
        createTime: r.createTime ?? new Date().toISOString(),
      });
    }

    pageToken = data.nextPageToken ?? null;
    if (!pageToken) break;
  }

  return { ok: true, reviews: all };
}
