// Chat client for the shared REIFGO backend. The backend runs a Haiku-powered
// assistant scoped to REIFGO with a live property-search tool, so the website
// and the mobile app answer from the same brain and the same database.
//
// Base URL matches contentApi/admin: VITE_API_URL in production, /cms-api proxy
// locally (see vite.config.js). CORS for this origin is already configured on
// the backend, and POST is an allowed method.
const BASE = import.meta.env.VITE_API_URL || "/cms-api";

/**
 * @param {{role: 'user'|'assistant', content: string}[]} messages full turn history
 * @returns {Promise<{reply: string, properties: any[]}>}
 */
export async function sendChat(messages) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // The endpoint is throttled to protect the API credit.
    if (res.status === 429) {
      throw new Error("You're sending messages quickly — give it a moment and try again.");
    }
    throw new Error((data && data.message) || "Request failed");
  }

  return {
    reply: (data && data.reply) || "",
    properties: (data && data.properties) || [],
  };
}
