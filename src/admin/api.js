// CMS API client. In dev, /cms-api is proxied by Vite to the NestJS backend
// on :3000; in production set VITE_API_URL to the deployed backend URL.
// With no backend configured (production build without VITE_API_URL, or
// VITE_DEMO=1), the dashboard runs in demo mode on built-in sample data.
import { demoRequest } from "./demoApi.js";

const BASE = import.meta.env.VITE_API_URL || "/cms-api";
export const IS_DEMO =
  import.meta.env.VITE_DEMO === "1" ||
  (import.meta.env.PROD && !import.meta.env.VITE_API_URL);

// Session = { token, role: "admin" | "developer", developer_id, name }.
// The role only drives what the UI shows; real enforcement is (and must
// stay) server-side, keyed off the JWT claims.
const SESSION_KEY = "reifgo_admin_session";

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

/**
 * REIFGO's own staff, as opposed to a developer or a Sales Agent. The backend
 * now issues `reifgo_admin` and `regional_admin` tokens alongside the original
 * shared `admin` login, so checking for "admin" alone would lock those out.
 */
export function isReifgoTier(session = getSession()) {
  return ["admin", "reifgo_admin", "regional_admin"].includes(session?.role);
}

/**
 * What a team account may do. REIFGO and the developer's company login can do
 * everything on their side; a team account only what it was given. The UI
 * uses this to hide controls; the server enforces the same rules.
 */
export const PERMISSIONS = [
  { key: "view_all_leads", label: "See all the company's leads" },
  { key: "assign_leads", label: "Hand out leads and set lead distribution" },
  { key: "manage_properties", label: "Add and edit listings" },
  { key: "manage_team", label: "Add and manage team accounts" },
  { key: "edit_company", label: "Edit the company profile" },
];

export const PERMISSION_PRESETS = {
  sales_manager: { label: "Sales Manager", permissions: ["view_all_leads", "assign_leads", "manage_team"] },
  sales_agent: { label: "Sales Agent", permissions: [] },
};

export function can(permission, session = getSession()) {
  if (!session) return false;
  if (isReifgoTier(session) || session.role === "developer") return true;
  return (session.permissions ?? []).includes(permission);
}

/** "Sales Manager", "Sales Agent" or "Custom" for a set of permissions. */
export function permissionTitle(permissions = []) {
  const same = (a, b) => a.length === b.length && a.every((p) => b.includes(p));
  for (const preset of Object.values(PERMISSION_PRESETS)) {
    if (same(permissions, preset.permissions)) return preset.label;
  }
  return "Custom access";
}

/** Customer support: the Investors pages and nothing else (server-enforced). */
export function isSupport(session = getSession()) {
  return session?.role === "support";
}

/** Who sees app investors: REIFGO admins, regional admins and support. */
export function canSeeInvestors(session = getSession()) {
  return isReifgoTier(session) || isSupport(session);
}

/** A main REIFGO admin (not a regional one): can change people's emails. */
export function isReifgoAdmin(session = getSession()) {
  return ["admin", "reifgo_admin"].includes(session?.role);
}

/** Main admins, and regional admins whose account allows it, add developers. */
export function canCreateDevelopers(session = getSession()) {
  return isReifgoAdmin(session) || (session?.role === "regional_admin" && !!session.can_create_developers);
}

/** A Sales Manager, as far as access goes: someone who hands out leads. */
export const isManagerAccess = (permissions = []) => permissions.includes("assign_leads");

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
    developer_id: data.developer_id ?? null,
    broker_id: data.broker_id ?? null,
    permissions: data.permissions ?? [],
    name: data.name ?? "Admin",
    can_create_developers: !!data.can_create_developers,
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
