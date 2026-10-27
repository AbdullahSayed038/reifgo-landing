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

// The backend runs on a free tier that sleeps when idle and takes up to a
// minute to wake. A request sent into that gap could hang with no answer, which
// left the Forum on its loading bars indefinitely. Each attempt is now capped,
// and a timeout, network failure or 5xx is retried with a growing pause.
const ATTEMPT_TIMEOUT_MS = 20000;
const RETRY_DELAYS_MS = [1500, 4000, 8000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function get(path) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}surface=${SURFACE}`;

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      // no-store: the public pages should reflect a CMS edit on the next load,
      // never a browser-cached copy.
      res = await fetchWithTimeout(url, { cache: "no-store" });
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    // 4xx is a real answer (e.g. a missing article) and is not retried.
    if (res.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return res.json();
  }
}

export const fetchInsights = () => get("/insights");
export const fetchInsight = (slug) => get(`/insights/${encodeURIComponent(slug)}`);
export const fetchCategories = () => get("/categories?scope=insight");
export const fetchSummit = () => get("/summit");

export async function sendWebsiteLead(payload) {
  const res = await fetch(`${BASE}/leads/website`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Too many requests just now — please try again in a minute.");
    }
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || "Could not send your request. Please try again.");
  }
  return data;
}

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
