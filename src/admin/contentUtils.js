// Shared helpers for the two editorial sections (Insights and Forum). Both
// carry the same hierarchy — tier, featured, category, display order — and the
// same per-surface visibility flags, so the vocabulary lives in one place.

export const TIERS = [
  { value: "primary", label: "Primary — leads the page" },
  { value: "secondary", label: "Secondary — fills the body" },
];

export const TIER_LABEL = { primary: "Primary", secondary: "Secondary" };

// The API stores visibility as two independent booleans; ChannelBadges (shared
// with Properties and Events) wants a { app, website } object.
export const channelsOf = (record) => ({
  app: !!record.show_on_app,
  website: !!record.show_on_website,
});

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

// Empty strings would be stored as empty values rather than "unset"; the API
// treats an absent key as "leave it alone".
export const str = (v) => (v === "" || v == null ? undefined : v);

// The <select> for category uses "" for "no category", which must reach the API
// as null so an existing category is actually cleared.
export const optionalId = (v) => (v === "" || v == null ? null : v);

/**
 * The order the public site will render these in, so the CMS list can preview
 * it: pinned first (forum only), then primary before secondary, then the
 * admin's display_order, then newest.
 */
export function contentSort(a, b) {
  if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
  if (a.tier !== b.tier) return a.tier === "primary" ? -1 : 1;
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  return new Date(b.published_at ?? b.created_at) - new Date(a.published_at ?? a.created_at);
}
