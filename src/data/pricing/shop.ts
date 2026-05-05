/**
 * Shop-specific pricing constants — applied on top of the paper /
 * canvas engine totals when a customer buys a shop artwork (a print
 * we curate / license, as opposed to bringing their own file).
 *
 * The engine prices the *production* (paper + ink + labour + handling
 * + finishing). It does not include the artwork itself, so we tack on
 * a flat fee per print to cover licensing / curation overhead.
 *
 * If we ever want this to vary per-artwork (e.g. higher fee for
 * limited editions), add an `artwork_base_fee_sgd` column to the
 * artworks table and override here from the shop page.
 */
export const SHOP_ARTWORK_BASE_SGD = 10;
