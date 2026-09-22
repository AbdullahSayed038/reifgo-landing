import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, can, getSession, isReifgoTier, permissionTitle } from "../api.js";
import { BarChart, DonutChart } from "../components/charts.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAutoRefresh } from "../useAutoRefresh.js";
import { ESCALATION, fmtHours, initials, timeAgo } from "../leadUtils.js";

const PROP_COLORS = { active: "#1e7d4f", coming_soon: "#92650f", sold_out: "#b3372f" };
const LIFECYCLE_BARS = [
  ["new", "New", "#2b5d8c"],
  ["assigned", "Assigned", "#0891b2"],
  ["contacted", "Contacted", "#1e7d4f"],
  ["qualified", "Qualified", "#15803d"],
  ["closed", "Closed", "#6b7a84"],
];

// Matches CLOSED_STATUSES server-side: a closed lead needs no Sales Agent.
const CLOSED = ["closed_won", "closed_lost"];
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Reworked after Syed's Sept 22 note ("Dashboard needs to be fixed"): cards in
 * even rows of four, REIFGO sees what's waiting for approval and leads per
 * developer, counts only real (approved, active) accounts and live listings,
 * and every card goes somewhere that exists.
 */
export default function Dashboard() {
  const session = getSession();
  const isAdmin = isReifgoTier(session);
  const isBroker = session?.role === "broker";
  const seesAll = can("view_all_leads", session);

  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(() => {
    const skip = () => Promise.resolve(null);
    const calls = [
      api.get("/admin/stats"),
      api.get("/admin/leads"),
      can("manage_properties", session) ? api.get("/admin/properties") : skip(),
      seesAll || can("manage_team", session) ? api.get("/admin/brokers") : skip(),
      isAdmin ? api.get("/admin/approvals") : skip(),
    ];
    // allSettled: one panel failing must not blank the others.
    Promise.allSettled(calls).then((results) => {
      const [s, l, p, b, a] = results;
      if (s.status === "fulfilled") setStats(s.value);
      if (l.status === "fulfilled") setLeads(l.value ?? []);
      if (p.status === "fulfilled") setProperties(p.value ?? []);
      if (b.status === "fulfilled") setTeam(b.value ?? []);
      if (a.status === "fulfilled") setApprovals(a.value);
      const failed = results.filter((r) => r.status === "rejected");
      setError(failed.length ? `Some panels couldn't load: ${failed.map((f) => f.reason?.message ?? "error").join("; ")}` : "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useAutoRefresh(load);

  const count = (fn) => leads.filter(fn).length;
  const isUnassigned = (l) => !l.assigned_broker_id && !CLOSED.includes(l.status);
  const open = count((l) => !CLOSED.includes(l.status));
  const attentionCount = count((l) => l.escalation);
  const unassigned = count(isUnassigned);
  const won = count((l) => l.status === "closed_won");
  const closed = count((l) => CLOSED.includes(l.status));

  const liveListings = properties.filter((p) => (p.approval_status ?? "approved") === "approved");
  const waitingListings = properties.filter((p) => p.approval_status === "pending" || p.has_pending_changes).length;
  const activeTeam = team.filter((b) => b.is_active && (b.approval_status ?? "approved") === "approved");

  const lifecycleBars = LIFECYCLE_BARS.map(([key, label, color]) => ({
    label,
    color,
    value: key === "closed" ? closed : count((l) => l.status === key),
  }));

  // REIFGO: where the open leads are, by developer.
  const byDeveloper = Object.values(
    leads
      .filter((l) => !CLOSED.includes(l.status))
      .reduce((acc, l) => {
        const name = clean(l.developer_name) || "REIFGO (general)";
        acc[name] = acc[name] ?? { label: name, value: 0 };
        acc[name].value += 1;
        return acc;
      }, {}),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const agentBars = activeTeam
    .filter((b) => b.stats.avg_response_hours != null)
    .map((b) => ({ label: b.name, value: b.stats.avg_response_hours }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const propByStatus = liveListings.reduce((a, p) => ((a[p.status] = (a[p.status] ?? 0) + 1), a), {});
  const propertyDonut = [
    { label: "Active", value: propByStatus.active ?? 0, color: PROP_COLORS.active },
    { label: "Coming soon", value: propByStatus.coming_soon ?? 0, color: PROP_COLORS.coming_soon },
    { label: "Sold out", value: propByStatus.sold_out ?? 0, color: PROP_COLORS.sold_out },
  ];

  // Escalated first, then unassigned, then waiting on a first reply.
  const attention = [...leads]
    .filter((l) => l.escalation || isUnassigned(l) || (l.status === "assigned" && !l.first_response_at))
    .sort((a, b) => (a.escalation ? 0 : isUnassigned(a) ? 1 : 2) - (b.escalation ? 0 : isUnassigned(b) ? 1 : 2))
    .slice(0, 6);

  const approvalPreview = approvals
    ? [
        ...approvals.accounts.map((a) => ({ key: `a${a.id}`, kind: "Team account", title: `${a.name} · ${permissionTitle(a.permissions)}`, who: a.developer_name, at: a.created_at })),
        ...approvals.listings.map((l) => ({ key: `l${l.id}`, kind: l.kind === "new" ? "New listing" : "Listing edit", title: l.name, who: l.developer_name, at: l.submitted_at })),
        ...approvals.amenities.map((r) => ({ key: `m${r.id}`, kind: "Amenity", title: r.label, who: r.developer_name, at: r.created_at })),
        ...approvals.logos.map((d) => ({ key: `g${d.id}`, kind: "Logo", title: "New logo", who: d.name, at: d.logo_requested_at })),
      ]
        .sort((a, b) => new Date(a.at) - new Date(b.at))
        .slice(0, 5)
    : [];

  const greeting = isAdmin
    ? "What needs you today, and how leads are moving."
    : isBroker && !seesAll
      ? `${session?.name}: your assigned leads.`
      : `${session?.name}: your listings and lead pipeline.`;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>{greeting}</p>
        </div>
      </header>

      {error && <div className="adm-error-banner">{error}</div>}

      {/* Row 1: what needs someone now. */}
      <div className="adm-stat-grid adm-stat-grid--4">
        {isAdmin ? (
          <StatCard label="Waiting for approval" value={approvals?.total} to="/admin/approvals" accent={approvals?.total > 0} />
        ) : can("manage_properties", session) ? (
          <StatCard label="Listings waiting for REIFGO" value={waitingListings} to="/admin/properties" accent={waitingListings > 0} />
        ) : (
          <StatCard label="Contacted" value={count((l) => l.status === "contacted")} to="/admin/leads" />
        )}
        <StatCard label="Needs attention" value={attentionCount} to="/admin/leads" accent={attentionCount > 0} />
        <StatCard label={isBroker && !seesAll ? "New for you" : "Unassigned leads"} value={isBroker && !seesAll ? count((l) => l.status === "assigned" && !l.first_response_at) : unassigned} to="/admin/leads" accent={unassigned > 0} />
        <StatCard label="Open leads" value={open} to="/admin/leads" />
      </div>

      {/* Row 2: the size of things. */}
      <div className="adm-stat-grid adm-stat-grid--4">
        {isAdmin ? (
          <>
            <StatCard label="Developers" value={stats?.developers} to="/admin/developers" />
            <StatCard label="Live listings" value={liveListings.length || stats?.properties} to="/admin/developers" />
            <StatCard label="Sales team members" value={activeTeam.length} to="/admin/team" />
            <StatCard label="App users" value={stats?.users} to="/admin/users" />
          </>
        ) : (
          <>
            {can("manage_properties", session) && <StatCard label="Live listings" value={liveListings.length} to="/admin/properties" />}
            {(seesAll || can("manage_team", session)) && <StatCard label="Team members" value={activeTeam.length} to="/admin/team" />}
            <StatCard label="Won" value={won} to="/admin/leads" />
            <StatCard label="Close rate" value={closed ? `${Math.round((won / closed) * 100)}%` : "—"} to="/admin/leads" />
          </>
        )}
      </div>

      <div className="adm-chart-grid adm-chart-grid--2">
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Lead pipeline</h2></header>
          {leads.length === 0 ? <p className="adm-panel__empty">No leads yet.</p> : <BarChart data={lifecycleBars} />}
        </section>

        {isAdmin ? (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Open leads by developer</h2></header>
            {byDeveloper.length === 0 ? <p className="adm-panel__empty">No open leads.</p> : <BarChart data={byDeveloper} color="#00556c" />}
          </section>
        ) : seesAll || can("manage_team", session) ? (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Average response by team member</h2></header>
            {agentBars.length === 0 ? (
              <p className="adm-panel__empty">No responses logged yet.</p>
            ) : (
              <BarChart data={agentBars} color="#0891b2" valueFormat={(v) => fmtHours(v)} />
            )}
          </section>
        ) : (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Your listings by status</h2></header>
            <DonutChart data={propertyDonut} centerLabel="Listings" />
          </section>
        )}
      </div>

      <div className={`adm-chart-grid${isAdmin ? " adm-chart-grid--2" : ""}`}>
        {isAdmin && (
          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Waiting for approval</h2>
              <Link className="adm-btn adm-btn--ghost" to="/admin/approvals">Open Approvals</Link>
            </header>
            {approvalPreview.length === 0 ? (
              <p className="adm-panel__empty">Nothing waiting. You're all caught up.</p>
            ) : (
              <ul className="adm-lead-list">
                {approvalPreview.map((a) => (
                  <li key={a.key} className="adm-table__row--link" onClick={() => navigate("/admin/approvals")} style={{ cursor: "pointer" }}>
                    <div>
                      <strong>{a.title}</strong>
                      <span> · {a.who}</span>
                    </div>
                    <span className="adm-badge adm-badge--pending">{a.kind} · {timeAgo(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Leads that need attention</h2>
            <Link className="adm-btn adm-btn--ghost" to="/admin/leads">View all leads</Link>
          </header>
          {attention.length === 0 ? (
            <p className="adm-panel__empty">Nothing waiting. Every lead is moving.</p>
          ) : (
            <ul className="adm-lead-list">
              {attention.map((lead) => (
                <li
                  key={lead.id}
                  className="adm-table__row--link"
                  onClick={() => navigate(`/admin/leads/${lead.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div>
                    <strong>{lead.user?.full_name || "Unnamed"}</strong>
                    <span> · {lead.property?.name ?? clean(lead.developer_name) ?? lead.interest ?? "Enquiry"}</span>
                    {lead.broker && (
                      <span className="adm-broker-name" style={{ marginTop: 4, fontSize: 12 }}>
                        <span className="adm-avatar" style={{ width: 18, height: 18, fontSize: 9 }}>{initials(lead.broker.name)}</span>
                        {lead.broker.name}
                      </span>
                    )}
                  </div>
                  {lead.escalation ? (
                    <span className={`adm-badge adm-badge--esc-${ESCALATION[lead.escalation].tone}`}>{ESCALATION[lead.escalation].label}</span>
                  ) : isUnassigned(lead) ? (
                    <span className="adm-badge adm-badge--esc-developer">Unassigned · {timeAgo(lead.created_at)}</span>
                  ) : (
                    <StatusBadge value={lead.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
