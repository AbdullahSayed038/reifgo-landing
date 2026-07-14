// In-memory implementation of the admin API for demo mode (no backend).
// Handles the same method+path surface as api.js and returns the same
// response shapes. State lives for the page session; a refresh resets it.
//
// Developer accounts see only their own rows — the same scoping the real
// backend will apply server-side from the JWT's developer_id claim, so
// swapping in live APIs later changes nothing in the pages.
import {
  readStoredInsights,
  readWebsiteLeads,
  updateWebsiteLead,
  writeStoredInsights,
} from "../lib/demoStore.js";
import { ApiError, getSession } from "./api.js";
import { createDemoData } from "./demoData.js";

// username -> account. All demo passwords are "123".
const ACCOUNTS = {
  admin: { role: "admin", developer_id: null, name: "REIFGO Admin" },
  aldar: { role: "developer", developer_id: "aldar", name: "ALDAR PROPERTIES" },
  reportage: {
    role: "developer",
    developer_id: "reportage",
    name: "REPORTAGE PROPERTIES",
  },
};

const db = createDemoData();
// Insights persist in localStorage so the public site can render them and
// edits survive reloads; everything else resets per session.
db.insights = readStoredInsights() ?? db.insights;
const persistInsights = () => writeStoredInsights(db.insights);

let seq = 0;
const newId = (prefix) => `${prefix}-${Date.now()}-${++seq}`;
const wait = () => new Promise((r) => setTimeout(r, 150));

// developer_id to scope to, or null for full admin access
const scope = () => {
  const s = getSession();
  return s?.role === "developer" ? s.developer_id : null;
};

const notFound = (what) => {
  throw new ApiError(404, `${what} not found`);
};

const devBrief = (id) => {
  const d = db.developers.find((x) => x.id === id);
  return d ? { id: d.id, name: d.name } : null;
};

const propertyFull = (p) => ({
  ...p,
  developer: devBrief(p.developer_id),
  media: [...p.media].sort((a, b) => a.display_order - b.display_order),
});

const developerFull = (d) => ({
  ...d,
  values: [...d.values].sort((a, b) => a.display_order - b.display_order),
  _count: { properties: db.properties.filter((p) => p.developer_id === d.id).length },
});

const leadFull = (l) => {
  const u = db.users.find((x) => x.id === l.user_id);
  const p = db.properties.find((x) => x.id === l.property_id);
  return {
    ...l,
    user: u ? { id: u.id, full_name: u.full_name, phone: u.phone, email: u.email } : null,
    property: p ? { id: p.id, name: p.name } : null,
  };
};

const myPropertyIds = (dev) =>
  new Set(db.properties.filter((p) => p.developer_id === dev).map((p) => p.id));

// Website form submissions, mapped to the same shape as app leads.
const websiteLeads = () =>
  readWebsiteLeads().map((w) => ({
    id: w.id,
    source: "website",
    lead_type: w.lead_type,
    status: w.status,
    created_at: w.created_at,
    interest: w.interest,
    message: w.message,
    user: { id: null, full_name: w.name, phone: w.phone, email: w.email },
    property: null,
  }));

export async function demoRequest(method, path, body) {
  await wait();
  const key = `${method} ${path}`;
  const dev = scope();

  if (key === "POST /admin/auth/login") {
    const account = ACCOUNTS[(body?.username ?? "").trim().toLowerCase()];
    if (!account || body?.password !== "123") {
      throw new ApiError(401, "Invalid username or password");
    }
    return { access_token: `demo-${body.username}`, ...account };
  }

  if (key === "GET /admin/stats") {
    const props = dev
      ? db.properties.filter((p) => p.developer_id === dev)
      : db.properties;
    const mine = dev ? myPropertyIds(dev) : null;
    const leads = mine
      ? db.leads.filter((l) => mine.has(l.property_id))
      : [...db.leads, ...websiteLeads()];
    return {
      properties: props.length,
      developers: db.developers.length,
      events: db.events.length,
      users: db.users.length,
      leads_total: leads.length,
      leads_pending: leads.filter((l) => l.status === "pending").length,
    };
  }

  // ---- Properties ----
  if (key === "GET /admin/properties") {
    const rows = dev
      ? db.properties.filter((p) => p.developer_id === dev)
      : db.properties;
    return rows.map(propertyFull);
  }
  if (key === "POST /admin/properties") {
    const { media = [], roi, ...scalars } = body;
    const created = {
      id: newId("prop"),
      created_at: new Date().toISOString(),
      ...scalars,
      developer_id: dev ?? scalars.developer_id,
      status: scalars.status ?? "active",
      media: media.map((m, i) => ({ id: newId("m"), display_order: i, type: "image", ...m })),
      roi: roi ? { id: newId("roi"), ...roi } : null,
    };
    db.properties.unshift(created);
    return propertyFull(created);
  }
  let m = path.match(/^\/admin\/properties\/([^/]+)$/);
  if (m) {
    const p = db.properties.find((x) => x.id === m[1]) ?? notFound("Property");
    if (dev && p.developer_id !== dev) notFound("Property");
    if (method === "GET") return propertyFull(p);
    if (method === "PATCH") {
      const { media, roi, developer_id, ...scalars } = body;
      Object.assign(p, scalars);
      if (!dev && developer_id !== undefined) p.developer_id = developer_id;
      if (media !== undefined)
        p.media = media.map((x, i) => ({ id: newId("m"), display_order: i, type: "image", ...x }));
      if (roi !== undefined) p.roi = roi ? { id: p.roi?.id ?? newId("roi"), ...roi } : null;
      return propertyFull(p);
    }
    if (method === "DELETE") {
      db.properties = db.properties.filter((x) => x.id !== p.id);
      db.leads = db.leads.filter((l) => l.property_id !== p.id);
      return { deleted: true };
    }
  }

  // ---- Developers ----
  if (key === "GET /admin/developers") {
    const rows = dev ? db.developers.filter((d) => d.id === dev) : db.developers;
    return rows.map(developerFull);
  }
  if (key === "POST /admin/developers") {
    if (dev) throw new ApiError(403, "Developers can't create other developers");
    const { values = [], ...scalars } = body;
    const created = {
      id: newId("dev"),
      created_at: new Date().toISOString(),
      is_verified: false,
      is_approved: false,
      ...scalars,
      values: values.map((v, i) => ({ id: newId("v"), display_order: i, ...v })),
    };
    db.developers.unshift(created);
    return developerFull(created);
  }
  m = path.match(/^\/admin\/developers\/([^/]+)$/);
  if (m) {
    const d = db.developers.find((x) => x.id === m[1]) ?? notFound("Developer");
    if (dev && d.id !== dev) notFound("Developer");
    if (method === "GET") return developerFull(d);
    if (method === "PATCH") {
      const { values, is_verified, is_approved, ...scalars } = body;
      Object.assign(d, scalars);
      // Verification/approval is an admin decision — developers can't self-approve.
      if (!dev) {
        if (is_verified !== undefined) d.is_verified = is_verified;
        if (is_approved !== undefined) d.is_approved = is_approved;
      }
      if (values !== undefined)
        d.values = values.map((v, i) => ({ id: newId("v"), display_order: i, ...v }));
      return developerFull(d);
    }
    if (method === "DELETE") {
      if (dev) throw new ApiError(403, "Developers can't delete developer accounts");
      if (db.properties.some((p) => p.developer_id === d.id)) {
        throw new ApiError(409, "This developer still has properties. Delete or reassign them first.");
      }
      db.developers = db.developers.filter((x) => x.id !== d.id);
      return { deleted: true };
    }
  }

  // ---- Events (shared — the app schema has no per-developer events yet) ----
  if (key === "GET /admin/events") return [...db.events];
  if (key === "POST /admin/events") {
    const created = {
      id: newId("ev"),
      created_at: new Date().toISOString(),
      type: "in_person",
      ...body,
      _count: { registrations: 0 },
    };
    db.events.unshift(created);
    return created;
  }
  m = path.match(/^\/admin\/events\/([^/]+)$/);
  if (m) {
    const ev = db.events.find((x) => x.id === m[1]) ?? notFound("Event");
    if (method === "GET") return ev;
    if (method === "PATCH") return Object.assign(ev, body);
    if (method === "DELETE") {
      db.events = db.events.filter((x) => x.id !== ev.id);
      return { deleted: true };
    }
  }

  // ---- Leads ----
  // Developer accounts see leads on their own properties; website form
  // submissions (no property attached) belong to the REIFGO admin inbox.
  if (key === "GET /admin/leads") {
    const mine = dev ? myPropertyIds(dev) : null;
    const rows = mine
      ? db.leads.filter((l) => mine.has(l.property_id)).map(leadFull)
      : [...db.leads.map(leadFull), ...websiteLeads()];
    return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  m = path.match(/^\/admin\/leads\/([^/]+)$/);
  if (m && method === "PATCH") {
    const lead = db.leads.find((x) => x.id === m[1]);
    if (lead) {
      if (dev && !myPropertyIds(dev).has(lead.property_id)) notFound("Lead");
      lead.status = body.status;
      return leadFull(lead);
    }
    if (dev) notFound("Lead");
    const updated = updateWebsiteLead(m[1], { status: body.status });
    if (!updated) notFound("Lead");
    return websiteLeads().find((w) => w.id === m[1]);
  }

  // ---- Insights ----
  if (key === "GET /admin/insights") {
    const rows = dev
      ? db.insights.filter((i) => i.author_developer_id === dev)
      : db.insights;
    return [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  if (key === "POST /admin/insights") {
    const session = getSession();
    const created = {
      id: newId("in"),
      created_at: new Date().toISOString(),
      channels: { app: true, website: false },
      published: false,
      ...body,
      // Developers always author as themselves.
      ...(dev && { author_developer_id: dev, author_name: session?.name }),
    };
    db.insights.unshift(created);
    persistInsights();
    return created;
  }
  m = path.match(/^\/admin\/insights\/([^/]+)$/);
  if (m) {
    const insight = db.insights.find((x) => x.id === m[1]) ?? notFound("Insight");
    if (dev && insight.author_developer_id !== dev) notFound("Insight");
    if (method === "GET") return insight;
    if (method === "PATCH") {
      const { author_developer_id, author_name, ...rest } = body;
      Object.assign(insight, rest);
      if (!dev) {
        if (author_name !== undefined) insight.author_name = author_name;
      }
      persistInsights();
      return insight;
    }
    if (method === "DELETE") {
      db.insights = db.insights.filter((x) => x.id !== insight.id);
      persistInsights();
      return { deleted: true };
    }
  }

  // ---- Users (admin only) ----
  if (key === "GET /admin/users") {
    if (dev) throw new ApiError(403, "Admin only");
    return [...db.users];
  }

  throw new ApiError(404, `No demo handler for ${key}`);
}
