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
  admin: { role: "admin", developer_id: null, broker_id: null, name: "REIFGO Admin" },
  aldar: { role: "developer", developer_id: "aldar", broker_id: null, name: "ALDAR PROPERTIES" },
  reportage: {
    role: "developer",
    developer_id: "reportage",
    broker_id: null,
    name: "REPORTAGE PROPERTIES",
  },
  // Brokers work under a developer and only see leads assigned to them.
  omar: { role: "broker", developer_id: "aldar", broker_id: "bk-omar", name: "Omar Al Farsi" },
  fatima: { role: "broker", developer_id: "aldar", broker_id: "bk-fatima", name: "Fatima Zahra" },
  yusuf: { role: "broker", developer_id: "reportage", broker_id: "bk-yusuf", name: "Yusuf Rahman" },
};

const STATUS_LABEL = {
  new: "New",
  assigned: "Assigned",
  contacted: "Contacted",
  qualified: "Qualified",
  closed_won: "Closed (won)",
  closed_lost: "Closed (lost)",
};
const CLOSED = ["closed_won", "closed_lost"];

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

const sessionInfo = () => {
  const s = getSession() ?? {};
  return {
    role: s.role ?? "admin",
    developer_id: s.developer_id ?? null,
    broker_id: s.broker_id ?? null,
    name: s.name ?? "Admin",
  };
};

const brokerBrief = (id) => {
  const b = db.brokers.find((x) => x.id === id);
  return b ? { id: b.id, name: b.name, developer_id: b.developer_id } : null;
};

// Hours between two ISO timestamps (or since `iso` if `to` omitted).
const hoursBetween = (from, to = new Date().toISOString()) =>
  from ? (new Date(to).getTime() - new Date(from).getTime()) / 3600000 : null;

// Escalation state: an assigned lead with no broker response escalates to the
// developer at 24h and to REIFGO at 48h. Computed live, never stored.
function escalationOf(lead) {
  if (!lead.assigned_broker_id || lead.first_response_at) return null;
  if (lead.status !== "assigned") return null;
  const h = hoursBetween(lead.assigned_at);
  if (h == null) return null;
  if (h >= 48) return "reifgo";
  if (h >= 24) return "developer";
  return null;
}

const responseHoursOf = (lead) =>
  lead.assigned_at && lead.first_response_at
    ? Math.round(hoursBetween(lead.assigned_at, lead.first_response_at) * 10) / 10
    : null;

const leadFull = (l) => {
  const u = db.users.find((x) => x.id === l.user_id);
  const p = db.properties.find((x) => x.id === l.property_id);
  return {
    ...l,
    source: "app",
    user: u ? { id: u.id, full_name: u.full_name, phone: u.phone, email: u.email } : null,
    property: p ? { id: p.id, name: p.name } : null,
    developer_id: p ? p.developer_id : null,
    broker: l.assigned_broker_id ? brokerBrief(l.assigned_broker_id) : null,
    escalation: escalationOf(l),
    response_hours: responseHoursOf(l),
    activity: [...(l.activity ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1)),
  };
};

const myPropertyIds = (dev) =>
  new Set(db.properties.filter((p) => p.developer_id === dev).map((p) => p.id));

// Old website-lead statuses predate the broker lifecycle — map them forward.
const mapWebsiteStatus = (s) =>
  ({ pending: "new", contacted: "contacted", closed: "closed_won" }[s] ?? s ?? "new");

// Session-lived extra state for website leads (status changes + notes) — the
// demo store only persists status, so notes live here for the page session.
const websiteExtra = {};

// Website form submissions, mapped to the same shape as app leads so the
// leads list and detail page treat them uniformly (admin inbox only).
const websiteLeads = () =>
  readWebsiteLeads().map((w) => {
    const extra = websiteExtra[w.id] ?? {};
    const creation = {
      id: `wact-${w.id}`,
      at: w.created_at,
      actor: w.name || "Website visitor",
      type: "creation",
      note: "Submitted the website enquiry form",
    };
    return {
      id: w.id,
      source: "website",
      lead_type: w.lead_type,
      status: extra.status ?? mapWebsiteStatus(w.status),
      assigned_broker_id: null,
      broker: null,
      developer_id: null,
      created_at: w.created_at,
      assigned_at: null,
      first_response_at: null,
      closed_at: null,
      escalation: null,
      response_hours: null,
      interest: w.interest,
      message: w.message,
      user: { id: null, full_name: w.name, phone: w.phone, email: w.email },
      property: null,
      activity: [...(extra.activity ?? []), creation].sort((a, b) => (a.at < b.at ? 1 : -1)),
    };
  });

// Per-broker performance rollup from the leads assigned to them.
const brokerStats = (b) => {
  const ls = db.leads.filter((l) => l.assigned_broker_id === b.id);
  const won = ls.filter((l) => l.status === "closed_won").length;
  const lost = ls.filter((l) => l.status === "closed_lost").length;
  const closed = won + lost;
  const resp = ls.map(responseHoursOf).filter((x) => x != null);
  return {
    total: ls.length,
    open: ls.filter((l) => !CLOSED.includes(l.status)).length,
    overdue: ls.filter((l) => escalationOf(l)).length,
    closed_won: won,
    closed_lost: lost,
    close_rate: closed ? Math.round((won / closed) * 100) : null,
    avg_response_hours: resp.length
      ? Math.round((resp.reduce((a, c) => a + c, 0) / resp.length) * 10) / 10
      : null,
  };
};

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

  const info = sessionInfo();
  const isAdmin = info.role === "admin";
  const isDev = info.role === "developer";
  const isBroker = info.role === "broker";
  const mine = isDev ? myPropertyIds(info.developer_id) : null;

  // Brokers only ever touch the leads and stats surface.
  if (isBroker) {
    const brokerOk =
      key === "GET /admin/stats" ||
      key === "GET /admin/brokers" ||
      /^\/admin\/leads(\/|$)/.test(path);
    if (!brokerOk) throw new ApiError(403, "Not available for broker accounts");
  }

  // Leads visible to the current account, before website leads are folded in.
  const visibleAppLeads = () => {
    if (isBroker) return db.leads.filter((l) => l.assigned_broker_id === info.broker_id);
    if (isDev) return db.leads.filter((l) => mine.has(l.property_id));
    return db.leads;
  };

  if (key === "GET /admin/stats") {
    const appLeads = visibleAppLeads();
    const webCount = isAdmin ? readWebsiteLeads().length : 0;
    const propsCount = isDev
      ? db.properties.filter((p) => p.developer_id === info.developer_id).length
      : db.properties.length;
    const brokerCount = isAdmin
      ? db.brokers.length
      : isDev
        ? db.brokers.filter((b) => b.developer_id === info.developer_id).length
        : 1;
    return {
      properties: propsCount,
      developers: db.developers.length,
      events: db.events.length,
      users: db.users.length,
      brokers: brokerCount,
      leads_total: appLeads.length + webCount,
      leads_open: appLeads.filter((l) => !CLOSED.includes(l.status)).length,
      leads_overdue: appLeads.filter((l) => escalationOf(l)).length,
    };
  }

  if (key === "GET /admin/brokers") {
    const rows = isAdmin
      ? db.brokers
      : isDev
        ? db.brokers.filter((b) => b.developer_id === info.developer_id)
        : db.brokers.filter((b) => b.id === info.broker_id);
    return rows.map((b) => ({ ...b, stats: brokerStats(b) }));
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
  // Brokers see leads assigned to them; developers see leads on their own
  // listings; admin sees everything plus website enquiries.
  if (key === "GET /admin/leads") {
    const rows = [
      ...visibleAppLeads().map(leadFull),
      ...(isAdmin ? websiteLeads() : []),
    ];
    return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  const canTouchAppLead = (lead) => {
    if (isAdmin) return true;
    if (isDev) return mine.has(lead.property_id);
    if (isBroker) return lead.assigned_broker_id === info.broker_id;
    return false;
  };
  const entry = (type, note) => ({
    id: newId("act"),
    at: new Date().toISOString(),
    actor: info.name,
    type,
    note,
  });

  // Add an activity note to a lead.
  m = path.match(/^\/admin\/leads\/([^/]+)\/activity$/);
  if (m && method === "POST") {
    const note = (body?.note ?? "").trim();
    if (!note) throw new ApiError(400, "Note can't be empty");
    const lead = db.leads.find((x) => x.id === m[1]);
    if (lead) {
      if (!canTouchAppLead(lead)) notFound("Lead");
      lead.activity.push(entry("note", note));
      return leadFull(lead);
    }
    if (!isAdmin || !readWebsiteLeads().some((x) => x.id === m[1])) notFound("Lead");
    (websiteExtra[m[1]] ??= { activity: [] }).activity.push(entry("note", note));
    return websiteLeads().find((x) => x.id === m[1]);
  }

  m = path.match(/^\/admin\/leads\/([^/]+)$/);
  if (m) {
    const lead = db.leads.find((x) => x.id === m[1]);
    if (lead) {
      if (!canTouchAppLead(lead)) notFound("Lead");
      if (method === "GET") return leadFull(lead);
      if (method === "PATCH") {
        // Assignment — admin and developers only.
        if (body.assigned_broker_id !== undefined) {
          if (isBroker) throw new ApiError(403, "Brokers can't reassign leads");
          const bId = body.assigned_broker_id;
          if (bId) {
            const b = db.brokers.find((x) => x.id === bId);
            if (!b) throw new ApiError(400, "Unknown broker");
            const propDev = db.properties.find((p) => p.id === lead.property_id)?.developer_id;
            const allowedDev = isDev ? info.developer_id : propDev;
            if (b.developer_id !== allowedDev)
              throw new ApiError(400, "That broker works for a different developer");
            const reassign = lead.assigned_broker_id && lead.assigned_broker_id !== bId;
            lead.assigned_broker_id = bId;
            lead.assigned_at = new Date().toISOString();
            if (lead.status === "new") lead.status = "assigned";
            lead.activity.push(entry("assignment", `${reassign ? "Reassigned" : "Assigned"} to ${b.name}`));
          } else {
            lead.assigned_broker_id = null;
            lead.assigned_at = null;
            lead.activity.push(entry("assignment", "Unassigned"));
          }
        }
        // Status change.
        if (body.status !== undefined && body.status !== lead.status) {
          lead.status = body.status;
          const now = new Date().toISOString();
          if (body.status === "contacted" && !lead.first_response_at) lead.first_response_at = now;
          if (CLOSED.includes(body.status)) lead.closed_at = now;
          lead.activity.push(entry("status", `Status → ${STATUS_LABEL[body.status] ?? body.status}`));
        }
        return leadFull(lead);
      }
    }
    // Website lead (admin only).
    if (!isAdmin || !readWebsiteLeads().some((x) => x.id === m[1])) notFound("Lead");
    if (method === "GET") return websiteLeads().find((x) => x.id === m[1]);
    if (method === "PATCH") {
      if (body.status !== undefined) {
        updateWebsiteLead(m[1], { status: body.status });
        const extra = (websiteExtra[m[1]] ??= { activity: [] });
        extra.status = body.status;
        extra.activity.push(entry("status", `Status → ${STATUS_LABEL[body.status] ?? body.status}`));
      }
      return websiteLeads().find((x) => x.id === m[1]);
    }
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
