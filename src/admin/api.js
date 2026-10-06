// CMS API client. In dev, /cms-api is proxied by Vite to the NestJS backend
// on :3000; in production set VITE_API_URL to the deployed backend URL.
// With no backend configured (production build without VITE_API_URL, or
// VITE_DEMO=1), the dashboard runs in demo mode on built-in sample data.
import { demoRequest } from "./demoApi.js";

const BASE = import.meta.env.VITE_API_URL || "/cms-api";
export const IS_DEMO =
  import.meta.env.VITE_DEMO === "1" ||
  (import.meta.env.PROD && !import.meta.env.VITE_API_URL);

// Session = { token, role: "admin" | "staff", name, full_access, permissions }.
// It only drives what the UI shows; real enforcement is (and must stay)
// server-side, where each person's areas are read fresh on every request.
const SESSION_KEY = "reifgo_admin_session";

export function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    // Sessions from before the one-team change (Oct 6) need a new sign-in.
    return s && ["admin", "staff"].includes(s.role) ? s : null;
  } catch {
    return null;
  }
}

/**
 * The areas someone on the REIFGO Team can be given (Syed, Oct 6: one list;
 * a few people have full access, everyone else what we tick). Same keys as
 * the backend's guards/permissions.ts.
 */
export const AREA_GROUPS = [
  {
    label: "Developers & listings",
    areas: [
      { key: "developers", label: "Edit developers and their listings" },
      { key: "add_developers", label: "Add new developers (a full admin approves them)" },
    ],
  },
  {
    label: "Content",
    areas: [
      { key: "events", label: "Events" },
      { key: "insights", label: "Insights" },
      { key: "forum", label: "Forum" },
    ],
  },
  {
    label: "Leads",
    areas: [
      { key: "leads_work", label: "Work leads (can be given leads)" },
      { key: "leads_all", label: "See every lead" },
      { key: "leads_assign", label: "Hand out leads and set lead distribution" },
    ],
  },
  {
    label: "Investors",
    areas: [
      { key: "investors", label: "Investor profiles" },
      { key: "investor_documents", label: "Open and verify investor documents" },
    ],
  },
  {
    label: "Oversight",
    areas: [
      { key: "approvals", label: "Approvals" },
      { key: "activity", label: "The whole activity log" },
    ],
  },
];
export const AREAS = AREA_GROUPS.flatMap((g) => g.areas);

/** One-click starting points in the REIFGO Team form. */
export const AREA_PRESETS = [
  { label: "Sales Manager", permissions: ["leads_work", "leads_all", "leads_assign"] },
  { label: "Sales Agent", permissions: ["leads_work"] },
  { label: "Customer support", permissions: ["investors"] },
  { label: "Content editor", permissions: ["events", "insights", "forum"] },
  {
    label: "Regional admin",
    permissions: ["developers", "leads_all", "leads_assign", "approvals", "activity", "investors"],
  },
];

/** The owner login, or someone given full access. */
export function hasFullAccess(session = getSession()) {
  return session?.role === "admin" || !!session?.full_access;
}

/** Full access, or this area was ticked. */
export function can(area, session = getSession()) {
  if (!session) return false;
  if (hasFullAccess(session)) return true;
  return (session.permissions ?? []).includes(area);
}

export const canAny = (areas, session = getSession()) => areas.some((a) => can(a, session));

/** "Full access", a preset's name, or the areas in short. */
export function accessTitle(fullAccess, permissions = []) {
  if (fullAccess) return "Full access";
  const same = (a, b) => a.length === b.length && a.every((p) => b.includes(p));
  const preset = AREA_PRESETS.find((p) => same(permissions, p.permissions));
  if (preset) return preset.label;
  if (!permissions.length) return "No areas yet";
  return `${permissions.length} area${permissions.length === 1 ? "" : "s"}`;
}

/** Old name, kept for the sales views: a person's access in a few words. */
export const permissionTitle = (permissions = [], fullAccess = false) => accessTitle(fullAccess, permissions);

/** Everyone signed in is REIFGO now (developers don't sign in, Oct 6). */
export function isReifgoTier(session = getSession()) {
  return !!session;
}

/** Full access (the name is from when this meant "main REIFGO admin"). */
export const isReifgoAdmin = hasFullAccess;

/** Who sees app investors. */
export function canSeeInvestors(session = getSession()) {
  return canAny(["investors", "investor_documents"], session);
}

/** Only investor profiles: the old "customer support" view of the menu. */
export function isSupport(session = getSession()) {
  return !hasFullAccess(session) && canSeeInvestors(session) && (session?.permissions ?? []).every((p) => p.startsWith("investor"));
}

export function canCreateDevelopers(session = getSession()) {
  return can("add_developers", session);
}

export const LEAD_AREAS = ["leads_work", "leads_all", "leads_assign"];

/**
 * The areas that open each CMS section (same split as the server's
 * AdminGuard AREA_ROUTES). null = anyone signed in; "full" = full access.
 */
const SECTION_AREAS = {
  // The dashboard is about leads and approvals; anyone else starts on their
  // first page (content editors on Events, support on Investors).
  "": [...LEAD_AREAS, "approvals"],
  account: null,
  activity: null,
  company: null,
  developers: ["developers", "add_developers"],
  properties: ["developers", "add_developers"],
  amenities: ["developers", "add_developers"],
  events: ["events"],
  insights: ["insights"],
  categories: ["insights"],
  summit: ["forum"],
  leads: LEAD_AREAS,
  team: ["leads_assign", "leads_all"],
  users: ["investors", "investor_documents"],
  approvals: ["approvals"],
  staff: "full",
};

/** Whether this person can open a CMS page (UI only; the server enforces). */
export function canOpen(pathname, session = getSession()) {
  if (!session) return false;
  const section = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  if (!(section in SECTION_AREAS)) return hasFullAccess(session);
  const areas = SECTION_AREAS[section];
  if (areas === null) return true;
  if (areas === "full") return hasFullAccess(session);
  return canAny(areas, session);
}

/** Someone who hands out leads. */
export const isManagerAccess = (permissions = []) => permissions.includes("leads_assign");

// Online means a CMS request in the last few minutes (the sidebar polls every
// 20 seconds while the CMS is open).
const ONLINE_MS = 5 * 60 * 1000;

/** { online, label } for an account's last_seen_at. */
export function presence(lastSeenAt) {
  if (!lastSeenAt) return { online: false, label: "Never signed in" };
  const ms = Date.now() - new Date(lastSeenAt).getTime();
  if (ms < ONLINE_MS) return { online: true, label: "Online" };
  const mins = Math.round(ms / 60000);
  if (mins < 60) return { online: false, label: `Last seen ${mins} min ago` };
  const hours = Math.round(mins / 60);
  if (hours < 24) return { online: false, label: `Last seen ${hours}h ago` };
  const days = Math.round(hours / 24);
  if (days < 30) return { online: false, label: `Last seen ${days} day${days === 1 ? "" : "s"} ago` };
  return {
    online: false,
    label: `Last seen ${new Date(lastSeenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
  };
}

/** "+971 50 123 4567" -> "+971 50 ••• ••67" for lists; the full number shows once a lead is opened. */
export function maskPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "•••";
  const keepStart = phone.trim().startsWith("+") ? Math.min(5, digits.length - 4) : 3;
  let seen = 0;
  return phone.replace(/\d/g, (d) => {
    seen += 1;
    return seen <= keepStart || seen > digits.length - 2 ? d : "•";
  });
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  if (IS_DEMO) return demoRequest(method, path, body);

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // The CMS shows live operational data (leads, stats), so the browser must
      // never serve a stale cached copy — every call goes to the server.
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Can't reach the API — is the backend running?");
  }

  if (res.status === 401 && !path.startsWith("/admin/auth/")) {
    // Token expired or revoked: force a fresh login.
    clearSession();
    window.location.assign("/admin/login");
    throw new ApiError(401, "Session expired — please log in again");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || `Request failed (${res.status})`;
    const err = new ApiError(res.status, message);
    // Validation failures come back as a list; forms map them onto fields.
    err.details = Array.isArray(data?.message) ? data.message : null;
    throw err;
  }

  return data;
}

/**
 * A private file (an investor's document) as a Blob. It needs the sign-in
 * token, so it can't be a plain link; the caller opens an object URL.
 */
async function blob(path) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Can't reach the API — is the backend running?");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.message || `Request failed (${res.status})`);
  }
  return res.blob();
}

export const api = {
  blob,
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
};

export async function login(username, password) {
  const data = await request("POST", "/admin/auth/login", {
    username,
    password,
  });
  const session = {
    token: data.access_token,
    role: data.role ?? "admin",
    broker_id: data.broker_id ?? null,
    full_access: !!data.full_access,
    permissions: data.permissions ?? [],
    name: data.name ?? "Admin",
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** Keeps the sidebar name in step after it's edited in Account settings. */
export function updateSessionName(name) {
  const session = getSession();
  if (!session) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, name }));
}

export function logout() {
  clearSession();
}

// Upload an image and get back a URL to store on the record.
// Demo mode inlines the file as a data URL (kept for the session only);
// real mode posts to /admin/uploads, which the backend will back with
// object storage (S3/Cloudinary) when it's deployed.
export async function uploadImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new ApiError(400, "Only image files can be uploaded");
  }
  if (file.size > 2.5 * 1024 * 1024) {
    throw new ApiError(400, "Image too large (max 2.5 MB)");
  }

  if (IS_DEMO) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result });
      reader.onerror = () => reject(new ApiError(500, "Could not read the file"));
      reader.readAsDataURL(file);
    });
  }

  const body = new FormData();
  body.append("file", file);
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}/admin/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
  } catch {
    throw new ApiError(0, "Can't reach the API — is the backend running?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || "Upload failed");
  }
  return data;
}
