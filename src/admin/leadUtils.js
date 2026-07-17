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
