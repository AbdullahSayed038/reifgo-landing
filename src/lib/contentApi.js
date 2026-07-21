// Public read-only client for the shared backend. The CMS talks to the same
// API through src/admin/api.js — this half needs no auth and only ever reads,
// apart from the summit invitation form.
//
// Base URL matches the admin client: VITE_API_URL in production, and the
// /cms-api dev proxy (see vite.config.js) locally.
const BASE = import.meta.env.VITE_API_URL || "/cms-api";

// Every request is tagged with the surface so the backend returns only what an
// admin has ticked for the website. The app passes "app" for the same rows.
const SURFACE = "website";

async function get(path) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}surface=${SURFACE}`);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

export const fetchInsights = () => get("/insights");
export const fetchInsight = (slug) => get(`/insights/${encodeURIComponent(slug)}`);
export const fetchCategories = () => get("/categories?scope=insight");
export const fetchSummit = () => get("/summit");

export async function requestInvitation(payload) {
  const res = await fetch(`${BASE}/summit/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // The endpoint is throttled; 429 needs its own wording or it reads as a
    // validation failure and people just resubmit.
    if (res.status === 429) {
      throw new Error("Too many requests just now — please try again in a minute.");
    }
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || "Could not send your request. Please try again.");
  }
  return data;
}
