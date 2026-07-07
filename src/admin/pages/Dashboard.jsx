import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/admin/stats"), api.get("/admin/leads")])
      .then(([s, l]) => {
        setStats(s);
        setLeads(l.filter((x) => x.status === "pending").slice(0, 6));
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>REIFGO app content at a glance.</p>
        </div>
      </header>

      {error && <div className="adm-error-banner">{error}</div>}

      <div className="adm-stat-grid">
        <StatCard label="Properties" value={stats?.properties} />
        <StatCard label="Developers" value={stats?.developers} />
        <StatCard label="Events" value={stats?.events} />
        <StatCard label="App users" value={stats?.users} />
        <StatCard label="Total leads" value={stats?.leads_total} />
        <StatCard label="Pending leads" value={stats?.leads_pending} accent />
      </div>

      <section className="adm-panel">
        <header className="adm-panel__head">
          <h2>Pending leads</h2>
          <Link className="adm-btn adm-btn--ghost" to="/admin/leads">
            View all
          </Link>
        </header>
        {leads.length === 0 ? (
          <p className="adm-panel__empty">No pending leads. All caught up.</p>
        ) : (
          <ul className="adm-lead-list">
            {leads.map((lead) => (
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
