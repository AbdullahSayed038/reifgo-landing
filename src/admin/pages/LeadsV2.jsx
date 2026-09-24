import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, can, getSession, isReifgoTier, maskPhone } from "../api.js";
import Presence from "../components/Presence.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAutoRefresh } from "../useAutoRefresh.js";
import {
  APP_PROPERTY_URL,
  LEAD_CATEGORY,
  exactTime,
  fmtHours,
  initials,
  lastTouch,
  leadCategory,
  timeAgo,
  urgencyOf,
} from "../leadUtils.js";

// The queue's top strip: what to act on first, left to right.
const BUCKETS = [
  { key: "act", label: "Act now", hint: "Unassigned or overdue", match: (u) => u.level === "critical" || u.level === "high" },
  { key: "due", label: "Waiting for a reply", hint: "Inside the 24h window", match: (u) => u.level === "medium" },
  { key: "progress", label: "In progress", hint: "Contacted", match: (u) => u.level === "normal" },
  { key: "hot", label: "Qualified", hint: "Ready to close", match: (u) => u.level === "hot" },
  { key: "closed", label: "Closed", hint: "Won and lost", match: (u) => u.level === "done" },
];

const RANGES = [
  { key: "all", label: "All time", days: null },
  { key: "today", label: "Today", days: 0 },
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
];

// Pipeline columns, in the order a lead moves. One column per stage, so a
// lead is never in two; one without an agent says so on its card.
const STAGES = [
  { key: "new", label: "New", match: (l) => l.status === "new" },
  { key: "assigned", label: "Assigned", match: (l) => l.status === "assigned" },
  { key: "contacted", label: "Contacted", match: (l) => l.status === "contacted" },
  { key: "qualified", label: "Qualified", match: (l) => l.status === "qualified" },
  { key: "closed", label: "Closed", match: (l) => l.status?.startsWith("closed") },
];

// The next steps offered on a lead, by where it is now.
const MOVES = [
  { status: "contacted", label: "Contacted", from: ["new", "assigned"] },
  { status: "qualified", label: "Qualified", from: ["new", "assigned", "contacted"] },
  { status: "closed_won", label: "Won", from: ["assigned", "contacted", "qualified"] },
  { status: "closed_lost", label: "Lost", from: ["new", "assigned", "contacted", "qualified"] },
];

const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const regarding = (l) =>
  l.property?.name ?? (l.developer_name ? `${l.developer_name} (developer)` : clean(l.interest) || "General enquiry");

function startOf(range) {
  if (range.days == null) return null;
  if (range.days === 0) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return Date.now() - range.days * 86400000;
}

function UrgencyTag({ u }) {
  return (
    <span className={`adm-urgency adm-urgency--${u.level}`}>
      <span className="adm-urgency__dot" aria-hidden="true" />
      {u.label}
    </span>
  );
}

function AgentChip({ broker }) {
  if (!broker) return <span className="adm-lv2-agent adm-lv2-agent--none">Unassigned</span>;
  return (
    <span className="adm-lv2-agent">
      <span className="adm-avatar adm-avatar--xs">{initials(broker.name)}</span>
      {broker.name}
      <Presence at={broker.last_seen_at} compact />
    </span>
  );
}

/**
 * Leads V2 (Syed, Sept 24: the old page was "clunky" and didn't show urgency).
 * A queue sorted by what needs doing first, with a side panel to assign,
 * move the stage and add a note without leaving the list; and a pipeline
 * board. V1 is still one click away in the sidebar.
 */
export default function LeadsV2() {
  const session = getSession();
  const reifgo = isReifgoTier(session);
  const agentOnly = !can("view_all_leads", session);
  const canAssign = can("assign_leads", session);
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [loadedAt, setLoadedAt] = useState(null);
  const [view, setView] = useState("queue");
  const [bucket, setBucket] = useState("act");
  const [range, setRange] = useState(RANGES[0]);
  const [q, setQ] = useState("");
  const [developer, setDeveloper] = useState("all");
  const [agent, setAgent] = useState("all");
  const [type, setType] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(
    (surface = false) => {
      api
        .get("/admin/leads")
        .then((r) => {
          setRows(r);
          setLoadedAt(new Date());
          setNow(Date.now());
        })
        .catch((e) => surface && toast.error(e.message));
      if (!agentOnly || canAssign) api.get("/admin/brokers").then(setBrokers).catch(() => {});
    },
    [agentOnly, canAssign, toast],
  );
  useEffect(() => {
    load(true);
  }, [load]);
  useAutoRefresh(load);
  // Countdowns stay honest between refreshes.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const developerOptions = useMemo(() => {
    const seen = new Map();
    for (const r of rows ?? []) if (r.developer_id && !seen.has(r.developer_id)) seen.set(r.developer_id, r.developer_name);
    return [...seen].sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? ""));
  }, [rows]);

  // Everything but the bucket: the strip's counts follow these filters.
  const filtered = useMemo(() => {
    if (!rows) return [];
    const from = startOf(range);
    const needle = q.trim().toLowerCase();
    return rows
      .map((l) => ({ ...l, u: urgencyOf(l, now) }))
      .filter((l) => {
        if (from != null && new Date(l.created_at).getTime() < from) return false;
        if (developer !== "all" && l.developer_id !== developer) return false;
        if (agent === "none" ? !!l.assigned_broker_id : agent !== "all" && l.assigned_broker_id !== agent) return false;
        if (type !== "all" && leadCategory(l) !== type) return false;
        if (needle) {
          const hay = [l.user?.full_name, l.user?.email, l.user?.phone, l.property?.name, l.developer_name, l.broker?.name, l.interest]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      });
  }, [rows, range, developer, agent, type, q, now]);

  const counts = useMemo(
    () => Object.fromEntries(BUCKETS.map((b) => [b.key, filtered.filter((l) => b.match(l.u)).length])),
    [filtered],
  );

  // Most urgent first; inside a level, whoever has waited longest.
  const queue = useMemo(() => {
    const b = BUCKETS.find((x) => x.key === bucket) ?? BUCKETS[0];
    return filtered
      .filter((l) => b.match(l.u))
      .sort((a, b2) =>
        bucket === "closed"
          ? new Date(lastTouch(b2)) - new Date(lastTouch(a))
          : a.u.rank - b2.u.rank || new Date(a.created_at) - new Date(b2.created_at),
      );
  }, [filtered, bucket]);

  // Keep a lead selected. When the one on screen leaves this view (it was
  // assigned or moved on), the next one down takes its place, like an inbox,
  // rather than jumping back to the top.
  const lastIndex = useRef(0);
  const found = queue.findIndex((l) => l.id === selectedId);
  const selected = found >= 0 ? queue[found] : queue[Math.min(lastIndex.current, queue.length - 1)] ?? null;
  if (found >= 0) lastIndex.current = found;

  // ↑ / ↓ move through the queue (not while typing).
  const listRef = useRef(null);
  useEffect(() => {
    if (view !== "queue") return undefined;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const i = queue.findIndex((l) => l.id === selected?.id);
      const next = queue[Math.min(queue.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
      if (next) {
        e.preventDefault();
        setSelectedId(next.id);
        listRef.current?.querySelector(`[data-lead="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, queue, selected]);

  const filtersActive = range.key !== "all" || developer !== "all" || agent !== "all" || type !== "all" || !!q.trim();
  const clearFilters = () => {
    setRange(RANGES[0]);
    setDeveloper("all");
    setAgent("all");
    setType("all");
    setQ("");
  };

  const firstWithLeads = BUCKETS.find((b) => counts[b.key] > 0)?.key;
  // Land on a bucket that has something in it.
  useEffect(() => {
    if (rows && counts[bucket] === 0 && firstWithLeads && bucket === "act") setBucket(firstWithLeads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <>
      <header className="adm-page-head adm-lv2-head">
        <div>
          <h1>{agentOnly ? "My Leads" : "Leads"}</h1>
          <p>
            {agentOnly
              ? "Your enquiries, most urgent first. Reply inside 24 hours to keep them."
              : "Every enquiry, most urgent first. Assign, update and note without leaving the list."}
          </p>
        </div>
        <div className="adm-lv2-head__side">
          <div className="adm-segmented" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === "queue"} className={view === "queue" ? "is-active" : ""} onClick={() => setView("queue")}>
              Queue
            </button>
            <button type="button" role="tab" aria-selected={view === "pipeline"} className={view === "pipeline" ? "is-active" : ""} onClick={() => setView("pipeline")}>
              Pipeline
            </button>
          </div>
          {loadedAt && (
            <span className="adm-lv2-updated" title="Refreshes every 20 seconds">
              Updated {loadedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      {view === "queue" && (
        <div className="adm-lv2-strip" role="tablist" aria-label="Urgency">
          {BUCKETS.map((b) => (
            <button
              key={b.key}
              type="button"
              role="tab"
              aria-selected={bucket === b.key}
              aria-label={`${b.label}: ${rows ? counts[b.key] : "loading"}`}
              className={`adm-lv2-bucket adm-lv2-bucket--${b.key}${bucket === b.key ? " is-active" : ""}`}
              onClick={() => {
                setBucket(b.key);
                setSelectedId(null);
                lastIndex.current = 0;
              }}
            >
              <span className="adm-lv2-bucket__count">{rows ? counts[b.key] : "—"}</span>
              <span className="adm-lv2-bucket__label">{b.label}</span>
              <span className="adm-lv2-bucket__hint">{b.hint}</span>
            </button>
          ))}
        </div>
      )}

      <div className="adm-lv2-filters">
        <input
          type="search"
          className="adm-lv2-search"
          placeholder="Search investor, listing or agent…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="adm-segmented" role="group" aria-label="Received">
          {RANGES.map((r) => (
            <button key={r.key} type="button" className={range.key === r.key ? "is-active" : ""} onClick={() => setRange(r)}>
              {r.label}
            </button>
          ))}
        </div>
        {reifgo && developerOptions.length > 1 && (
          <select className="adm-inline-select" value={developer} onChange={(e) => setDeveloper(e.target.value)} aria-label="Developer">
            <option value="all">All developers</option>
            {developerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {!agentOnly && brokers.length > 0 && (
          <select className="adm-inline-select" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="Sales Agent">
            <option value="all">All agents</option>
            <option value="none">Unassigned</option>
            {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select className="adm-inline-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Lead type">
          <option value="all">All lead types</option>
          {Object.entries(LEAD_CATEGORY).map(([k, label]) => <option key={k} value={k}>{label} leads</option>)}
        </select>
        {filtersActive && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {rows === null ? (
        <section className="adm-panel"><p className="adm-panel__empty">Loading…</p></section>
      ) : view === "pipeline" ? (
        <Pipeline leads={filtered} onOpen={(id) => navigate(`/admin/leads/${id}`)} />
      ) : (
        <div className="adm-lv2-layout">
          <ol className="adm-lv2-list" ref={listRef} aria-label="Leads">
            {queue.length === 0 && (
              <li className="adm-lv2-empty">
                {bucket === "act" ? "Nothing urgent. Every lead has an agent and a reply on time." : "No leads here."}
              </li>
            )}
            {queue.map((l) => (
              <li key={l.id} data-lead={l.id}>
                <button
                  type="button"
                  className={`adm-lv2-card adm-lv2-card--${l.u.level}${selected?.id === l.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(l.id)}
                  onDoubleClick={() => navigate(`/admin/leads/${l.id}`)}
                >
                  <span className="adm-lv2-card__top">
                    <strong>{l.user?.full_name || "Unnamed investor"}</strong>
                    <time dateTime={l.created_at} title={`Received ${exactTime(l.created_at)}`}>{timeAgo(l.created_at)}</time>
                  </span>
                  <span className="adm-lv2-card__about">
                    {regarding(l)}
                    {l.property?.name && l.developer_name ? ` · ${l.developer_name}` : ""}
                  </span>
                  <span className="adm-lv2-card__foot">
                    <UrgencyTag u={l.u} />
                    <AgentChip broker={l.broker} />
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {selected ? (
            <LeadPreview
              key={selected.id}
              lead={selected}
              brokers={brokers}
              canAssign={canAssign}
              onChanged={(message) => {
                load(true);
                if (message) toast.success(message);
              }}
            />
          ) : (
            <aside className="adm-lv2-preview adm-lv2-preview--empty">Pick a lead to see it here.</aside>
          )}
        </div>
      )}
    </>
  );
}

/** The side panel: everything needed to act on a lead without opening it. */
function LeadPreview({ lead, brokers, canAssign, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const eligible = brokers.filter(
    (b) => b.developer_id === lead.developer_id && b.is_active && (b.approval_status ?? "approved") === "approved",
  );
  const [assignTo, setAssignTo] = useState(lead.assigned_broker_id ?? "");
  const cat = leadCategory(lead);
  const u = lead.u;
  const closed = lead.status?.startsWith("closed");

  const patch = async (body, message) => {
    setBusy(true);
    try {
      await api.patch(`/admin/leads/${lead.id}`, body);
      onChanged(message);
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/leads/${lead.id}/activity`, { note: note.trim() });
      setNote("");
      onChanged("Note added");
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  return (
    <aside className="adm-lv2-preview" aria-label="Lead details">
      <header className="adm-lv2-preview__head">
        <div>
          <h2>{lead.user?.full_name || "Unnamed investor"}</h2>
          <p>
            <span className={`adm-badge adm-badge--lead-${cat}`}>{LEAD_CATEGORY[cat]}</span>
            <span>{lead.source === "website" ? "Website" : "App"}</span>
            <span title={exactTime(lead.created_at)}>Received {exactTime(lead.created_at)}</span>
          </p>
        </div>
        <Link className="adm-btn adm-btn--ghost adm-btn--sm" to={`/admin/leads/${lead.id}`}>Open lead</Link>
      </header>

      <div className={`adm-lv2-alert adm-lv2-alert--${u.level}`}>
        <strong>{u.label}</strong>
        {u.detail && <span>{u.detail}</span>}
        {lead.response_hours != null && <span>First reply took {fmtHours(lead.response_hours)}</span>}
      </div>

      <dl className="adm-lv2-facts">
        <dt>Regarding</dt>
        <dd>
          {lead.property ? (
            <a href={APP_PROPERTY_URL(lead.property.id)} target="_blank" rel="noopener noreferrer">{lead.property.name} ↗</a>
          ) : (
            regarding(lead)
          )}
          {lead.property && lead.developer_name ? <span className="adm-muted"> · {lead.developer_name}</span> : null}
        </dd>
        {lead.interest && (<><dt>Interest</dt><dd>{lead.interest}</dd></>)}
        <dt>Contact</dt>
        <dd>
          {[lead.user?.email, maskPhone(lead.user?.phone)].filter(Boolean).join(" · ") || "—"}
          <span className="adm-muted"> (full number on the lead)</span>
        </dd>
        <dt>Stage</dt>
        <dd><StatusBadge value={lead.status} /></dd>
        <dt>Agent</dt>
        <dd><AgentChip broker={lead.broker} /></dd>
      </dl>

      {lead.message && <p className="adm-lv2-message">{lead.message}</p>}

      {canAssign && lead.developer_id && !closed && (
        <div className="adm-lv2-action">
          <label htmlFor={`assign-${lead.id}`}>{lead.assigned_broker_id ? "Reassign to" : "Assign to"}</label>
          <div className="adm-lv2-action__row">
            <select id={`assign-${lead.id}`} className="adm-inline-select" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} disabled={busy}>
              <option value="">Choose an agent…</option>
              {eligible.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.stats?.open != null ? ` · ${b.stats.open} open` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="adm-btn adm-btn--primary adm-btn--sm"
              disabled={busy || !assignTo || assignTo === lead.assigned_broker_id}
              onClick={() =>
                patch(
                  { assigned_broker_id: assignTo },
                  `Assigned to ${eligible.find((b) => b.id === assignTo)?.name ?? "the agent"}. It's now under Waiting for a reply.`,
                )
              }
            >
              Assign
            </button>
          </div>
          {eligible.length === 0 && <span className="adm-muted">This developer has no active agents yet.</span>}
        </div>
      )}
      {canAssign && !lead.developer_id && !closed && (
        <p className="adm-muted adm-lv2-action">A general enquiry stays with the REIFGO team; there's no developer agent to assign.</p>
      )}

      {!closed && (
        <div className="adm-lv2-action">
          <label>Move to</label>
          <div className="adm-lv2-action__row">
            {MOVES.filter((m) => m.from.includes(lead.status)).map((m) => (
              <button
                key={m.status}
                type="button"
                className={`adm-btn adm-btn--sm ${m.status === "closed_won" ? "adm-btn--primary" : "adm-btn--ghost"}`}
                disabled={busy}
                onClick={() => patch({ status: m.status }, `${lead.user?.full_name || "Lead"} moved to ${m.label}`)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="adm-lv2-action" onSubmit={addNote}>
        <label htmlFor={`note-${lead.id}`}>Add a note</label>
        <textarea
          id={`note-${lead.id}`}
          rows={2}
          value={note}
          placeholder="Called, sent the brochure, viewing on Tuesday…"
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="adm-lv2-action__row adm-lv2-action__row--end">
          <button className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy || !note.trim()}>Add note</button>
        </div>
      </form>

      {(lead.activity ?? []).length > 0 && (
        <div className="adm-lv2-timeline">
          <h3>Latest</h3>
          <ol>
            {lead.activity.slice(0, 4).map((a) => (
              <li key={a.id}>
                <time dateTime={a.at}>{exactTime(a.at)}</time>
                <span>
                  <strong>{a.actor}</strong> {a.note}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

/** Columns by stage. A card opens the lead. */
function Pipeline({ leads, onOpen }) {
  return (
    <div className="adm-lv2-board">
      {STAGES.map((s) => {
        const items = leads
          .filter(s.match)
          .sort((a, b) => a.u.rank - b.u.rank || new Date(a.created_at) - new Date(b.created_at));
        return (
          <section key={s.key} className="adm-lv2-col" aria-label={s.label}>
            <header>
              <h2>{s.label}</h2>
              <span>{items.length}</span>
            </header>
            <ol>
              {items.length === 0 && <li className="adm-lv2-empty">None</li>}
              {items.slice(0, 50).map((l) => (
                <li key={l.id}>
                  <button type="button" className={`adm-lv2-card adm-lv2-card--${l.u.level}`} onClick={() => onOpen(l.id)}>
                    <span className="adm-lv2-card__top">
                      <strong>{l.user?.full_name || "Unnamed investor"}</strong>
                      <time dateTime={l.created_at} title={exactTime(l.created_at)}>{timeAgo(l.created_at)}</time>
                    </span>
                    <span className="adm-lv2-card__about">{regarding(l)}</span>
                    <span className="adm-lv2-card__foot">
                      <UrgencyTag u={l.u} />
                    </span>
                    <span className="adm-lv2-card__foot">
                      <AgentChip broker={l.broker} />
                    </span>
                  </button>
                </li>
              ))}
              {items.length > 50 && <li className="adm-lv2-empty">+{items.length - 50} more. Narrow the filters to see them.</li>}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
