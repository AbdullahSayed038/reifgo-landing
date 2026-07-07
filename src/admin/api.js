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
    });
  } catch {
    throw new ApiError(0, "Can't reach the API — is the backend running?");
  }

  if (res.status === 401 && path !== "/admin/auth/login") {
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
    throw new ApiError(res.status, message);
  }

  return data;
}

export const api = {
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
    name: data.name ?? "Admin",
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  clearSession();
}
