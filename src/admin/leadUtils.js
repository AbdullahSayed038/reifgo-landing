// Shared helpers for the lead-management screens.

// The lifecycle a lead moves through, in order. closed_won / closed_lost are
// the two terminal states of the final "Closed" step.
export const LIFECYCLE = ["new", "assigned", "contacted", "qualified", "closed"];

export const STEP_LABEL = {
  new: "New",
  assigned: "Assigned",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
};

// Index of the step a status belongs to (closed_won/closed_lost → "closed").
export function stepIndex(status) {
  if (status === "closed_won" || status === "closed_lost") return 4;
  const i = LIFECYCLE.indexOf(status);
  return i === -1 ? 0 : i;
}

// What a lead is about. The server sends `category`; older payloads (the demo
// API) are worked out the same way from what the lead is linked to.
export const LEAD_CATEGORY = {
  property: "Property",
  developer: "Developer",
  general: "General",
};

export function leadCategory(lead) {
  if (lead?.category) return lead.category;
  if (lead?.property_id || lead?.property) return "property";
  if (lead?.developer_id) return "developer";
  return "general";
}

// The public listing in the app's web build, for the Linked property panel.
// The listing as investors see it, on this website (Syed, Sept 24), so a Sales
// Agent can open or share it without the app. Only live listings load there.
export const APP_PROPERTY_URL = (id) => `${window.location.origin}/property/${id}`;

export const ESCALATION = {
  developer: { label: "Escalated to you", tone: "developer" },
  reifgo: { label: "Escalated to REIFGO", tone: "reifgo" },
};

export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// "4.5h", "45m", or "3.2d" from a number of hours.
export function fmtHours(h) {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h * 10) / 10}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
}

// ── Leads V2: urgency ────────────────────────────────────────────────────
// Matches the server's escalation clock: an agent has 24h to reply before a
// lead escalates to the developer, 48h before it goes to REIFGO.
export const REPLY_WINDOW_H = 24;
const HOUR = 3_600_000;

/** "45m", "5h", "2d 3h", for a span in milliseconds. */
export function fmtSpan(ms) {
  const m = Math.max(0, Math.round(Math.abs(ms) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 && h < 10 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

/** "24 Sept, 14:05" (with the year when it isn't this year). */
export function exactTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * How urgent a lead is right now, for the V2 queue.
 * level: critical | high | medium | normal | hot | done
 * rank sorts the queue (lower first); label is the headline, detail the clock.
 */
export function urgencyOf(lead, now = Date.now()) {
  const since = (iso) => (iso ? now - new Date(iso).getTime() : 0);
  if (lead.status === "closed_won") return { level: "done", rank: 9, label: "Won", detail: null };
  if (lead.status === "closed_lost") return { level: "done", rank: 9, label: "Lost", detail: null };

  if (lead.escalation === "reifgo") {
    return { level: "critical", rank: 0, label: "Escalated to REIFGO", detail: `No reply for ${fmtSpan(since(lead.assigned_at))}` };
  }
  if (!lead.assigned_broker_id) {
    const waited = since(lead.created_at);
    return {
      level: waited >= 4 * HOUR ? "critical" : "high",
      rank: waited >= 4 * HOUR ? 1 : 2,
      label: "Needs an agent",
      detail: `Waiting ${fmtSpan(waited)}`,
    };
  }
  if (lead.escalation === "developer") {
    return { level: "critical", rank: 1, label: "Overdue", detail: `No reply for ${fmtSpan(since(lead.assigned_at))}` };
  }
  if (lead.status === "assigned" && !lead.first_response_at) {
    if (lead.rotation_expires_at) {
      const left = new Date(lead.rotation_expires_at).getTime() - now;
      return {
        level: left < HOUR ? "high" : "medium",
        rank: left < HOUR ? 2 : 3,
        label: left > 0 ? `Moves on in ${fmtSpan(left)}` : "Moving to the next agent",
        detail: "Auto rotation",
      };
    }
    const left = REPLY_WINDOW_H * HOUR - since(lead.assigned_at);
    return {
      level: left < 6 * HOUR ? "high" : "medium",
      rank: left < 6 * HOUR ? 2 : 3,
      label: `Reply due in ${fmtSpan(left)}`,
      detail: `Assigned ${fmtSpan(since(lead.assigned_at))} ago`,
    };
  }
  if (lead.status === "qualified") {
    return { level: "hot", rank: 4, label: "Qualified", detail: "Follow up to close" };
  }
  return { level: "normal", rank: 5, label: lead.status === "contacted" ? "Contacted" : "In progress", detail: null };
}

/** The last thing that happened on a lead (activity is newest first). */
export const lastTouch = (lead) => lead.activity?.[0]?.at ?? lead.created_at;
