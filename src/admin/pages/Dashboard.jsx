import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getSession } from "../api.js";
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

export default function Dashboard() {
  const session = getSession();
  const role = session?.role ?? "admin";
  const isAdmin = role === "admin";
  const isDeveloper = role === "developer";
  const isBroker = role === "broker";

  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [events, setEvents] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(() => {
    const skip = () => Promise.resolve(null);
    const calls = [
      api.get("/admin/stats"),
      api.get("/admin/leads"),
      isBroker ? skip() : api.get("/admin/properties"),
      isBroker ? skip() : api.get("/admin/events"),
      isBroker ? skip() : api.get("/admin/brokers"),
    ];

    // allSettled, not all: each panel sources its own endpoint, and one of them
    // failing must not discard the responses that did succeed.
    Promise.allSettled(calls).then((results) => {
      const [s, l, p, e, b] = results;
      if (s.status === "fulfilled") setStats(s.value);
      if (l.status === "fulfilled") setLeads(l.value ?? []);
      if (p.status === "fulfilled") setProperties(p.value ?? []);
      if (e.status === "fulfilled") setEvents(e.value ?? []);
      if (b.status === "fulfilled") setBrokers(b.value ?? []);

      // Surface the failures, but keep them distinguishable from a total outage
      // so a missing sub-feature doesn't read as "the dashboard is down".
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === results.length) {
        setError(failed[0].reason?.message ?? "Could not load the dashboard");
      } else if (failed.length > 0) {
        setError(
          `Some panels couldn't load: ${failed
            .map((f) => f.reason?.message ?? "unknown error")
            .join("; ")}`,
        );
      } else {
        setError("");
      }
    });
  }, [isBroker]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the pipeline, stats and "needs attention" list current on their own.
  useAutoRefresh(load);

  const count = (fn) => leads.filter(fn).length;
  const lifecycleBars = LIFECYCLE_BARS.map(([key, label, color]) => ({
    label,
    color,
    value:
      key === "closed"
        ? count((l) => l.status?.startsWith("closed"))
        : count((l) => l.status === key),
  }));

  const propByStatus = properties.reduce((a, p) => ((a[p.status] = (a[p.status] ?? 0) + 1), a), {});
  const propertyDonut = [
    { label: "Active", value: propByStatus.active ?? 0, color: PROP_COLORS.active },
    { label: "Coming soon", value: propByStatus.coming_soon ?? 0, color: PROP_COLORS.coming_soon },
    { label: "Sold out", value: propByStatus.sold_out ?? 0, color: PROP_COLORS.sold_out },
  ];

  const brokerBars = brokers
    .filter((b) => b.stats.avg_response_hours != null)
    .map((b) => ({ label: b.name, value: b.stats.avg_response_hours }));

  // Leads that need attention: overdue first, then unassigned/new, then awaiting response.
  const attention = [...leads]
    .filter((l) => l.escalation || l.status === "new" || (l.status === "assigned" && !l.first_response_at))
    .sort((a, b) => (a.escalation ? 0 : 1) - (b.escalation ? 0 : 1))
    .slice(0, 6);

  const greeting = isBroker
    ? `${session?.name} — your assigned leads.`
    : isDeveloper
      ? `${session?.name} — your listings and lead pipeline.`
      : "REIFGO content and lead pipeline at a glance.";

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>{greeting}</p>
        </div>
      </header>

      {error && <div className="adm-error-banner">{error}</div>}

      <div className="adm-stat-grid">
        {isBroker ? (
          <>
            <StatCard label="Open leads" value={stats?.leads_open} to="/admin/leads" />
            <StatCard label="Overdue" value={stats?.leads_overdue} to="/admin/leads" accent={stats?.leads_overdue > 0} />
            <StatCard label="Contacted" value={count((l) => l.status === "contacted")} to="/admin/leads" />
            <StatCard label="Closed won" value={count((l) => l.status === "closed_won")} to="/admin/leads" />
          </>
        ) : (
          <>
            <StatCard label={isDeveloper ? "My properties" : "Properties"} value={stats?.properties} to="/admin/properties" />
            {isAdmin && <StatCard label="Developers" value={stats?.developers} to="/admin/developers" />}
            <StatCard label="Brokers" value={stats?.brokers} to="/admin/team" />
            <StatCard label="Total leads" value={stats?.leads_total} to="/admin/leads" />
            <StatCard label="Open leads" value={stats?.leads_open} to="/admin/leads" />
            <StatCard label="Overdue" value={stats?.leads_overdue} to="/admin/leads" accent={stats?.leads_overdue > 0} />
          </>
        )}
      </div>

      <div className="adm-chart-grid">
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Lead pipeline</h2></header>
          {leads.length === 0 ? (
            <p className="adm-panel__empty">No leads yet.</p>
          ) : (
            <BarChart data={lifecycleBars} />
          )}
        </section>

        {!isBroker && (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Broker response time</h2></header>
            {brokerBars.length === 0 ? (
              <p className="adm-panel__empty">No responses logged yet.</p>
            ) : (
              <BarChart data={brokerBars} color="#0891b2" valueFormat={(v) => fmtHours(v)} />
            )}
          </section>
        )}

        {!isBroker && (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Properties by status</h2></header>
            {properties.length === 0 ? (
              <p className="adm-panel__empty">No properties.</p>
            ) : (
              <DonutChart data={propertyDonut} centerLabel="Properties" />
            )}
          </section>
        )}
      </div>

      <section className="adm-panel">
        <header className="adm-panel__head">
          <h2>Needs attention</h2>
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
                  <span> · {lead.property?.name ?? lead.interest ?? "Enquiry"}</span>
                  {lead.broker && (
                    <span className="adm-broker-name" style={{ marginTop: 4, fontSize: 12 }}>
                      <span className="adm-avatar" style={{ width: 18, height: 18, fontSize: 9 }}>{initials(lead.broker.name)}</span>
                      {lead.broker.name}
                    </span>
                  )}
                </div>
                {lead.escalation ? (
                  <span className={`adm-badge adm-badge--esc-${ESCALATION[lead.escalation].tone}`}>
                    {ESCALATION[lead.escalation].label}
                  </span>
                ) : lead.status === "new" ? (
                  <span className="adm-badge">Unassigned · {timeAgo(lead.created_at)}</span>
                ) : (
                  <StatusBadge value={lead.status} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
