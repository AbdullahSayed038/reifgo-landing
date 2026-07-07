import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getSession } from "../api.js";
import { BarChart, DonutChart } from "../components/charts.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

// Chart palette — status trio matches the badge colors; teal for single-hue
// magnitude bars. Validated for lightness/chroma/contrast (dataviz checks).
const STATUS_COLORS = {
  active: "#1e7d4f",
  coming_soon: "#92650f",
  sold_out: "#b3372f",
  pending: "#92650f",
  contacted: "#1e7d4f",
  closed: "#b3372f",
};
const TEAL = "#0891b2";

const countBy = (rows, key) =>
  rows.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] ?? 0) + 1), acc), {});

export default function Dashboard() {
  const session = getSession();
  const isDeveloper = session?.role === "developer";
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/leads"),
      api.get("/admin/properties"),
      api.get("/admin/events"),
    ])
      .then(([s, l, p, e]) => {
        setStats(s);
        setLeads(l);
        setProperties(p);
        setEvents(e);
      })
      .catch((err) => setError(err.message));
  }, []);

  const pendingLeads = leads.filter((x) => x.status === "pending").slice(0, 6);

  const byStatus = countBy(properties, "status");
  const propertyDonut = [
    { label: "Active", value: byStatus.active ?? 0, color: STATUS_COLORS.active },
    { label: "Coming soon", value: byStatus.coming_soon ?? 0, color: STATUS_COLORS.coming_soon },
    { label: "Sold out", value: byStatus.sold_out ?? 0, color: STATUS_COLORS.sold_out },
  ];

  const byLeadStatus = countBy(leads, "status");
  const leadBars = [
    { label: "Pending", value: byLeadStatus.pending ?? 0, color: STATUS_COLORS.pending },
    { label: "Contacted", value: byLeadStatus.contacted ?? 0, color: STATUS_COLORS.contacted },
    { label: "Closed", value: byLeadStatus.closed ?? 0, color: STATUS_COLORS.closed },
  ];

  const eventBars = [...events]
    .sort((a, b) => (b._count?.registrations ?? 0) - (a._count?.registrations ?? 0))
    .slice(0, 5)
    .map((e) => ({ label: e.title, value: e._count?.registrations ?? 0 }));

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>
            {isDeveloper
              ? `${session?.name} — your listings at a glance.`
              : "REIFGO app content at a glance."}
          </p>
        </div>
      </header>

      {error && <div className="adm-error-banner">{error}</div>}

      <div className="adm-stat-grid">
        <StatCard
          label={isDeveloper ? "My properties" : "Properties"}
          value={stats?.properties}
          to="/admin/properties"
        />
        {!isDeveloper && (
          <StatCard label="Developers" value={stats?.developers} to="/admin/developers" />
        )}
        <StatCard label="Events" value={stats?.events} to="/admin/events" />
        {!isDeveloper && <StatCard label="App users" value={stats?.users} to="/admin/users" />}
        <StatCard label="Total leads" value={stats?.leads_total} to="/admin/leads" />
        <StatCard label="Pending leads" value={stats?.leads_pending} to="/admin/leads" />
      </div>

      <div className="adm-chart-grid">
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Properties by status</h2></header>
          {properties.length === 0 ? (
            <p className="adm-panel__empty">No properties yet.</p>
          ) : (
            <DonutChart data={propertyDonut} centerLabel="Properties" />
          )}
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Lead pipeline</h2></header>
          {leads.length === 0 ? (
            <p className="adm-panel__empty">No leads yet.</p>
          ) : (
            <BarChart data={leadBars} />
          )}
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Event registrations</h2></header>
          {eventBars.length === 0 ? (
            <p className="adm-panel__empty">No events yet.</p>
          ) : (
            <BarChart data={eventBars} color={TEAL} />
          )}
        </section>
      </div>

      <section className="adm-panel">
        <header className="adm-panel__head">
          <h2>Pending leads</h2>
          <Link className="adm-btn adm-btn--ghost" to="/admin/leads">
            View all
          </Link>
        </header>
        {pendingLeads.length === 0 ? (
          <p className="adm-panel__empty">No pending leads. All caught up.</p>
        ) : (
          <ul className="adm-lead-list">
            {pendingLeads.map((lead) => (
              <li key={lead.id}>
                <div>
                  <strong>{lead.user?.full_name || lead.user?.phone}</strong>
                  <span> · {lead.property?.name}</span>
                </div>
                <StatusBadge value={lead.lead_type} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
