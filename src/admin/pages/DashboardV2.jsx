import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, can, getSession, isReifgoTier, permissionTitle } from "../api.js";
import { BarChart, ColumnChart, DonutChart } from "../components/charts.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAutoRefresh } from "../useAutoRefresh.js";
import { exactTime, fmtHours, initials, timeAgo, urgencyOf } from "../leadUtils.js";

// Syed, Sept 24: not a redo, just more useful. A time filter, comparisons
// with the period before, and real timestamps on everything.
const RANGES = [
  { key: "1", label: "24h", days: 1, word: "24 hours" },
  { key: "7", label: "7 days", days: 7, word: "7 days" },
  { key: "30", label: "30 days", days: 30, word: "30 days" },
  { key: "90", label: "90 days", days: 90, word: "90 days" },
  { key: "all", label: "All time", days: null, word: "all time" },
];
const RANGE_KEY = "reifgo_admin_dashboard_range";

const PROP_COLORS = { active: "#1e7d4f", coming_soon: "#92650f", sold_out: "#b3372f" };
const PIPELINE = [
  ["new", "New", "#2b5d8c"],
  ["assigned", "Assigned", "#0891b2"],
  ["contacted", "Contacted", "#1e7d4f"],
  ["qualified", "Qualified", "#15803d"],
  ["closed_won", "Won", "#0f766e"],
  ["closed_lost", "Lost", "#6b7a84"],
];
const CLOSED = ["closed_won", "closed_lost"];
const DAY = 86400000;
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

function readRange() {
  try {
    return RANGES.find((r) => r.key === localStorage.getItem(RANGE_KEY)) ?? RANGES[1];
  } catch {
    return RANGES[1];
  }
}

/** "↑ 25% vs the 7 days before", or nothing when there's nothing to compare. */
function delta(cur, prev, word) {
  if (cur == null || prev == null) return undefined;
  if (prev === 0) return cur === 0 ? `Same as the ${word} before` : `Up from 0 the ${word} before`;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return `Same as the ${word} before`;
  return `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs the ${word} before`;
}

/** Buckets for the "leads received" chart, sized to the range. */
function timeBuckets(range, leads) {
  const now = new Date();
  let buckets;
  if (range.days === 1) {
    buckets = Array.from({ length: 24 }, (_, i) => {
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() - 23 + i);
      return { start: start.getTime(), end: start.getTime() + 3600000, label: `${String(start.getHours()).padStart(2, "0")}:00` };
    });
  } else if (range.days && range.days <= 30) {
    buckets = Array.from({ length: range.days }, (_, i) => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (range.days - 1) + i);
      return {
        start: start.getTime(),
        end: start.getTime() + DAY,
        label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      };
    });
  } else if (range.days) {
    // 90 days: by week.
    const weeks = Math.ceil(range.days / 7);
    buckets = Array.from({ length: weeks }, (_, i) => {
      const end = now.getTime() - (weeks - 1 - i) * 7 * DAY;
      const start = end - 7 * DAY;
      return { start, end, label: new Date(start + DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) };
    });
  } else {
    // All time: the last 12 months.
    buckets = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1);
      return { start: start.getTime(), end: end.getTime(), label: start.toLocaleDateString("en-GB", { month: "short" }) };
    });
  }
  const times = leads.map((l) => new Date(l.created_at).getTime());
  return buckets.map((b) => {
    const value = times.filter((t) => t >= b.start && t < b.end).length;
    return { label: b.label, value, title: `${b.label}: ${value} lead${value === 1 ? "" : "s"}` };
  });
}

/**
 * Dashboard V2. Same data as V1; what's new is the time filter, the
 * comparison with the previous period, the leads-over-time chart and
 * timestamps. "Needs you now" ignores the filter: it's always the live state.
 */
export default function DashboardV2() {
  const session = getSession();
  const reifgo = isReifgoTier(session);
  const isBroker = session?.role === "broker";
  const seesAll = can("view_all_leads", session);
  const managesListings = can("manage_properties", session);
  const managesTeam = seesAll || can("manage_team", session);
  const navigate = useNavigate();

  const [range, setRangeState] = useState(readRange);
  const [leads, setLeads] = useState(null);
  const [properties, setProperties] = useState([]);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(null);

  const setRange = (r) => {
    try {
      localStorage.setItem(RANGE_KEY, r.key);
    } catch {
      /* private mode */
    }
    setRangeState(r);
  };

  const load = useCallback(() => {
    const skip = () => Promise.resolve(null);
    const calls = [
      api.get(`/admin/stats${range.days ? `?days=${range.days}` : ""}`),
      api.get("/admin/leads"),
      managesListings ? api.get("/admin/properties") : skip(),
      managesTeam ? api.get("/admin/brokers") : skip(),
      reifgo ? api.get("/admin/approvals") : skip(),
    ];
    Promise.allSettled(calls).then((results) => {
      const [s, l, p, b, a] = results;
      if (s.status === "fulfilled") setStats(s.value);
      if (l.status === "fulfilled") setLeads(l.value ?? []);
      if (p.status === "fulfilled") setProperties(p.value ?? []);
      if (b.status === "fulfilled") setTeam(b.value ?? []);
      if (a.status === "fulfilled") setApprovals(a.value);
      const failed = results.filter((r) => r.status === "rejected");
      setError(failed.length ? `Some panels couldn't load: ${failed.map((f) => f.reason?.message ?? "error").join("; ")}` : "");
      setLoadedAt(new Date());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.days]);

  useEffect(() => {
    load();
  }, [load]);
  useAutoRefresh(load);

  const all = useMemo(() => (leads ?? []).map((l) => ({ ...l, u: urgencyOf(l) })), [leads]);

  // ── Live state ──
  const actNow = all.filter((l) => l.u.level === "critical" || l.u.level === "high");
  const waiting = all.filter((l) => l.u.level === "medium");
  const open = all.filter((l) => !CLOSED.includes(l.status));
  const oldestAct = actNow.reduce((min, l) => (!min || l.created_at < min ? l.created_at : min), null);
  const waitingListings = properties.filter((p) => p.approval_status === "pending" || p.has_pending_changes);
  const oldestApproval = approvals
    ? [
        ...approvals.accounts.map((a) => a.created_at),
        ...approvals.listings.map((l) => l.submitted_at),
        ...approvals.amenities.map((r) => r.created_at),
        ...approvals.logos.map((d) => d.logo_requested_at),
        ...(approvals.developers ?? []).map((d) => d.created_at),
      ]
        .filter(Boolean)
        .sort()[0]
    : null;

  // ── In the chosen period, and the one before ──
  const now = Date.now();
  const from = range.days ? now - range.days * DAY : null;
  const prevFrom = range.days ? now - 2 * range.days * DAY : null;
  const inRange = (iso) => from == null || new Date(iso).getTime() >= from;
  const inPrev = (iso) => from != null && new Date(iso).getTime() >= prevFrom && new Date(iso).getTime() < from;
  const cur = all.filter((l) => inRange(l.created_at));
  const prev = all.filter((l) => inPrev(l.created_at));

  const repliedOnTime = (list) => {
    const assigned = list.filter((l) => l.assigned_at);
    if (!assigned.length) return null;
    const ok = assigned.filter((l) => l.response_hours != null && l.response_hours <= 24).length;
    return Math.round((ok / assigned.length) * 100);
  };
  const avgResponse = (list) => {
    const hrs = list.map((l) => l.response_hours).filter((h) => h != null);
    return hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null;
  };
  const won = (list) => list.filter((l) => l.status === "closed_won").length;
  const onTimeCur = repliedOnTime(cur);
  const onTimePrev = repliedOnTime(prev);
  const avgCur = avgResponse(cur);
  const avgPrev = avgResponse(prev);
  const word = range.word;
  // No comparisons until the leads are in: "same as before" on empty data misleads.
  const ready = leads !== null;
  const periodLabel = range.days ? `last ${range.word}` : "all time";

  const pipeline = PIPELINE.map(([key, label, color]) => ({ label, color, value: cur.filter((l) => l.status === key).length }));

  const byDeveloper = Object.values(
    cur.reduce((acc, l) => {
      const name = clean(l.developer_name) || "REIFGO (general)";
      acc[name] = acc[name] ?? { label: name, value: 0 };
      acc[name].value += 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const activeTeam = team.filter((b) => b.is_active && (b.approval_status ?? "approved") === "approved");
  const agentBars = activeTeam
    .filter((b) => b.stats?.avg_response_hours != null)
    .map((b) => ({ label: b.name, value: b.stats.avg_response_hours }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const liveListings = properties.filter((p) => (p.approval_status ?? "approved") === "approved");
  const propByStatus = liveListings.reduce((a, p) => ((a[p.status] = (a[p.status] ?? 0) + 1), a), {});
  const propertyDonut = [
    { label: "Active", value: propByStatus.active ?? 0, color: PROP_COLORS.active },
    { label: "Coming soon", value: propByStatus.coming_soon ?? 0, color: PROP_COLORS.coming_soon },
    { label: "Sold out", value: propByStatus.sold_out ?? 0, color: PROP_COLORS.sold_out },
  ];

  const attention = [...actNow, ...waiting]
    .sort((a, b) => a.u.rank - b.u.rank || new Date(a.created_at) - new Date(b.created_at))
    .slice(0, 6);

  const approvalPreview = approvals
    ? [
        ...approvals.accounts.map((a) => ({ key: `a${a.id}`, kind: "Team account", title: `${a.name} · ${permissionTitle(a.pending_permissions?.length ? a.pending_permissions : a.permissions)}`, who: a.developer_name, at: a.created_at })),
        ...approvals.listings.map((l) => ({ key: `l${l.id}`, kind: l.kind === "new" ? "New listing" : "Listing edit", title: l.name, who: l.developer_name, at: l.submitted_at })),
        ...approvals.amenities.map((r) => ({ key: `m${r.id}`, kind: "Amenity", title: r.label, who: r.developer_name, at: r.created_at })),
        ...approvals.logos.map((d) => ({ key: `g${d.id}`, kind: "Logo", title: "New logo", who: d.name, at: d.logo_requested_at })),
        ...(approvals.developers ?? []).map((d) => ({ key: `d${d.id}`, kind: "New developer", title: clean(d.name), who: d.created_by_admin?.name, at: d.created_at })),
      ]
        .sort((a, b) => new Date(a.at) - new Date(b.at))
        .slice(0, 5)
    : [];

  const greeting = reifgo
    ? "What needs you now, and how leads are moving."
    : isBroker && !seesAll
      ? `${session?.name}: your leads.`
      : `${session?.name}: your listings and lead pipeline.`;

  return (
    <>
      <header className="adm-page-head adm-dv2-head">
        <div>
          <h1>Dashboard</h1>
          <p>{greeting}</p>
        </div>
        <div className="adm-dv2-head__side">
          <div className="adm-segmented" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.key} type="button" className={range.key === r.key ? "is-active" : ""} onClick={() => setRange(r)}>
                {r.label}
              </button>
            ))}
          </div>
          {loadedAt && (
            <span className="adm-lv2-updated" title="Refreshes every 20 seconds">
              Updated {loadedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      {error && <div className="adm-error-banner">{error}</div>}

      <h2 className="adm-dv2-section">Needs you now</h2>
      <div className="adm-stat-grid adm-stat-grid--4">
        {reifgo ? (
          <StatCard
            label="Waiting for approval"
            value={approvals?.total}
            to="/admin/approvals"
            accent={approvals?.total > 0}
            hint={oldestApproval ? `Oldest ${timeAgo(oldestApproval)}` : "All caught up"}
          />
        ) : managesListings ? (
          <StatCard
            label="Listings waiting for REIFGO"
            value={waitingListings.length}
            to="/admin/properties"
            accent={waitingListings.length > 0}
          />
        ) : (
          <StatCard label="Contacted" value={leads ? all.filter((l) => l.status === "contacted").length : null} to="/admin/leads" />
        )}
        <StatCard
          label="Leads to act on"
          value={leads ? actNow.length : null}
          to="/admin/leads"
          accent={actNow.length > 0}
          hint={oldestAct ? `Oldest came in ${timeAgo(oldestAct)}` : "Unassigned or overdue"}
        />
        <StatCard label="Waiting for a reply" value={leads ? waiting.length : null} to="/admin/leads" hint="Inside the 24h window" />
        <StatCard label="Open leads" value={leads ? open.length : null} to="/admin/leads" />
      </div>

      <h2 className="adm-dv2-section">
        {range.days ? `Last ${range.word}` : "All time"}
        {range.days && <span> · since {exactTime(new Date(from).toISOString())}</span>}
      </h2>
      <div className={`adm-stat-grid ${reifgo ? "adm-stat-grid--6" : "adm-stat-grid--4"}`}>
        <StatCard label="New leads" value={leads ? cur.length : null} to="/admin/leads" hint={ready && range.days ? delta(cur.length, prev.length, word) : undefined} />
        <StatCard
          label="Replied within 24h"
          value={onTimeCur == null ? "—" : `${onTimeCur}%`}
          hint={!ready ? undefined : range.days && onTimeCur != null && onTimePrev != null ? `${onTimePrev}% the ${word} before` : "Of leads given to an agent"}
        />
        <StatCard
          label="Avg first reply"
          value={avgCur == null ? "—" : fmtHours(avgCur)}
          hint={range.days && avgPrev != null ? `${fmtHours(avgPrev)} the ${word} before` : undefined}
        />
        <StatCard label="Won" value={leads ? won(cur) : null} hint={!ready ? undefined : range.days ? delta(won(cur), won(prev), word) : "Of leads in this period"} />
        {reifgo && (
          <StatCard
            label="New investors"
            value={range.days ? stats?.range?.new_users : stats?.users}
            to="/admin/users"
            hint={range.days && stats?.range ? delta(stats.range.new_users, stats.range.new_users_prev, word) : "In the app"}
          />
        )}
        {reifgo && (
          <StatCard
            label="New listings"
            value={range.days ? stats?.range?.new_listings : liveListings.length || stats?.properties}
            to="/admin/developers"
            hint={range.days && stats?.range ? delta(stats.range.new_listings, stats.range.new_listings_prev, word) : "Live"}
          />
        )}
      </div>

      <section className="adm-panel">
        <header className="adm-panel__head">
          <h2>Leads received · {periodLabel}</h2>
          <span className="adm-muted">{cur.length} total</span>
        </header>
        {leads === null ? <p className="adm-panel__empty">Loading…</p> : <ColumnChart data={timeBuckets(range, all)} />}
      </section>

      <div className={`adm-chart-grid${reifgo || managesTeam || managesListings ? " adm-chart-grid--2" : ""}`}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Where those leads are now</h2></header>
          {cur.length === 0 ? <p className="adm-panel__empty">No leads in this period.</p> : <BarChart data={pipeline} />}
        </section>
        {reifgo ? (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Leads by developer · {periodLabel}</h2></header>
            {byDeveloper.length === 0 ? <p className="adm-panel__empty">No leads in this period.</p> : <BarChart data={byDeveloper} color="#00556c" />}
          </section>
        ) : managesTeam ? (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Average reply by team member</h2></header>
            {agentBars.length === 0 ? (
              <p className="adm-panel__empty">No replies logged yet.</p>
            ) : (
              <BarChart data={agentBars} color="#0891b2" valueFormat={(v) => fmtHours(v)} />
            )}
          </section>
        ) : managesListings ? (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Listings by status</h2></header>
            <DonutChart data={propertyDonut} centerLabel="Listings" />
          </section>
        ) : null}
      </div>

      <div className={`adm-chart-grid${reifgo ? " adm-chart-grid--2" : ""}`}>
        {reifgo && (
          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Waiting for approval</h2>
              <Link className="adm-btn adm-btn--ghost adm-btn--sm" to="/admin/approvals">Open Approvals</Link>
            </header>
            {approvalPreview.length === 0 ? (
              <p className="adm-panel__empty">Nothing waiting. You're all caught up.</p>
            ) : (
              <ul className="adm-dv2-list">
                {approvalPreview.map((a) => (
                  <li key={a.key}>
                    <button type="button" onClick={() => navigate("/admin/approvals")}>
                      <span className="adm-dv2-list__main">
                        <strong>{a.title}</strong>
                        <span>{[a.kind, a.who].filter(Boolean).join(" · ")}</span>
                      </span>
                      <time dateTime={a.at} title={exactTime(a.at)}>
                        {exactTime(a.at)}
                        <span>{timeAgo(a.at)}</span>
                      </time>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Leads to act on</h2>
            <Link className="adm-btn adm-btn--ghost adm-btn--sm" to="/admin/leads">Open Leads</Link>
          </header>
          {attention.length === 0 ? (
            <p className="adm-panel__empty">Nothing waiting. Every lead is moving.</p>
          ) : (
            <ul className="adm-dv2-list">
              {attention.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                    <span className="adm-dv2-list__main">
                      <strong>{l.user?.full_name || "Unnamed investor"}</strong>
                      <span>
                        {l.property?.name ?? (clean(l.developer_name) || clean(l.interest) || "General enquiry")}
                        {l.broker ? (
                          <>
                            {" · "}
                            <span className="adm-avatar adm-avatar--xs">{initials(l.broker.name)}</span> {l.broker.name}
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className="adm-dv2-list__side">
                      <span className={`adm-urgency adm-urgency--${l.u.level}`}>
                        <span className="adm-urgency__dot" aria-hidden="true" />
                        {l.u.label}
                      </span>
                      <time dateTime={l.created_at} title={exactTime(l.created_at)}>Received {exactTime(l.created_at)}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
