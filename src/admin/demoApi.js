// In-memory implementation of the admin API for demo mode (no backend).
// Handles the same method+path surface as api.js and returns the same
// response shapes. State lives for the page session; a refresh resets it.
import { ApiError } from "./api.js";
import { createDemoData } from "./demoData.js";

const db = createDemoData();
let seq = 0;
const newId = (prefix) => `${prefix}-${Date.now()}-${++seq}`;
const wait = () => new Promise((r) => setTimeout(r, 150));

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

export async function demoRequest(method, path, body) {
  await wait();
  const key = `${method} ${path}`;

  if (key === "POST /admin/auth/login") {
    if (body?.password !== "123") throw new ApiError(401, "Incorrect password");
    return { access_token: "demo-session" };
  }

  if (key === "GET /admin/stats") {
    return {
      properties: db.properties.length,
      developers: db.developers.length,
      events: db.events.length,
      users: db.users.length,
      leads_total: db.leads.length,
      leads_pending: db.leads.filter((l) => l.status === "pending").length,
    };
  }

  // ---- Properties ----
  if (key === "GET /admin/properties") return db.properties.map(propertyFull);
  if (key === "POST /admin/properties") {
    const { media = [], roi, ...scalars } = body;
    const created = {
      id: newId("prop"),
      created_at: new Date().toISOString(),
      ...scalars,
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
    if (method === "GET") return propertyFull(p);
    if (method === "PATCH") {
      const { media, roi, ...scalars } = body;
      Object.assign(p, scalars);
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
  if (key === "GET /admin/developers") return db.developers.map(developerFull);
  if (key === "POST /admin/developers") {
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
    if (method === "GET") return developerFull(d);
    if (method === "PATCH") {
      const { values, ...scalars } = body;
      Object.assign(d, scalars);
      if (values !== undefined)
        d.values = values.map((v, i) => ({ id: newId("v"), display_order: i, ...v }));
      return developerFull(d);
    }
    if (method === "DELETE") {
      if (db.properties.some((p) => p.developer_id === d.id)) {
        throw new ApiError(409, "This developer still has properties. Delete or reassign them first.");
      }
      db.developers = db.developers.filter((x) => x.id !== d.id);
      return { deleted: true };
    }
  }

  // ---- Events ----
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
  if (key === "GET /admin/leads") return db.leads.map(leadFull);
  m = path.match(/^\/admin\/leads\/([^/]+)$/);
  if (m && method === "PATCH") {
    const lead = db.leads.find((x) => x.id === m[1]) ?? notFound("Lead");
    lead.status = body.status;
    return leadFull(lead);
  }

  // ---- Users ----
  if (key === "GET /admin/users") return [...db.users];

  throw new ApiError(404, `No demo handler for ${key}`);
}
