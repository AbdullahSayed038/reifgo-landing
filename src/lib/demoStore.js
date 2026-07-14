// Demo-phase content bridge between the public website and the CMS.
//
// Until the backend is deployed, the CMS keeps its editable content in
// localStorage so the public pages can render it and website lead forms
// can feed the CMS inbox — same origin, shared storage. When the real
// API exists, the website fetches these from public endpoints instead
// and this module goes away; the shapes below already match the CMS.

const LEADS_KEY = "reifgo_demo_website_leads";
const INSIGHTS_KEY = "reifgo_demo_insights";

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded (e.g. huge uploaded images) — keep in memory
  }
};

// ---- Website leads (Join the Network / Request Advisory forms) ----

export function readWebsiteLeads() {
  return read(LEADS_KEY) ?? [];
}

export function addWebsiteLead({ name, email, phone, interest, message, lead_type }) {
  const lead = {
    id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lead_type,
    status: "pending",
    created_at: new Date().toISOString(),
    name,
    email,
    phone,
    interest,
    message,
  };
  write(LEADS_KEY, [lead, ...readWebsiteLeads()]);
  return lead;
}

export function updateWebsiteLead(id, patch) {
  const list = readWebsiteLeads();
  const lead = list.find((l) => l.id === id);
  if (!lead) return null;
  Object.assign(lead, patch);
  write(LEADS_KEY, list);
  return lead;
}

// ---- Insights (CMS-authored articles shown on the site + app) ----

// null means "the CMS never saved insights" — callers fall back to defaults.
export function readStoredInsights() {
  return read(INSIGHTS_KEY);
}

export function writeStoredInsights(list) {
  return write(INSIGHTS_KEY, list);
}

export function readPublishedWebsiteInsights() {
  const stored = readStoredInsights();
  if (!stored) return null;
  return stored.filter((i) => i.published && i.channels?.website);
}
