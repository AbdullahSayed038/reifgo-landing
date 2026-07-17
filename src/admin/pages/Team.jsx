import { useEffect, useState } from "react";
import { api, getSession } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import StatCard from "../components/StatCard.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtHours, initials } from "../leadUtils.js";

export default function Team() {
  const [brokers, setBrokers] = useState(null);
  const toast = useToast();
  const isAdmin = getSession()?.role === "admin";

  useEffect(() => {
    api.get("/admin/brokers").then(setBrokers).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = (brokers ?? []).reduce(
    (a, b) => {
      a.open += b.stats.open;
      a.overdue += b.stats.overdue;
      a.won += b.stats.closed_won;
      a.closed += b.stats.closed_won + b.stats.closed_lost;
      return a;
    },
    { open: 0, overdue: 0, won: 0, closed: 0 },
  );
  const teamCloseRate = totals.closed ? Math.round((totals.won / totals.closed) * 100) : null;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Team</h1>
          <p>Your brokers and how they're performing against assigned leads.</p>
        </div>
      </header>

      <div className="adm-stat-grid">
        <StatCard label="Brokers" value={brokers?.length} />
        <StatCard label="Open leads" value={totals.open} />
        <StatCard label="Overdue" value={totals.overdue} />
        <StatCard label="Team close rate" value={teamCloseRate == null ? "—" : `${teamCloseRate}%`} />
      </div>

      <DataTable
        rows={brokers ?? []}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search brokers…"
        emptyText={brokers === null ? "Loading…" : "No brokers yet."}
        columns={[
          {
            key: "name",
            label: "Broker",
            render: (b) => (
              <span className="adm-broker-name">
                <span className="adm-avatar">{initials(b.name)}</span>
                <span className="adm-cell-stack">
                  <strong>{b.name}</strong>
                  <span>{b.email}</span>
                </span>
              </span>
            ),
          },
          ...(isAdmin
            ? [{ key: "developer_id", label: "Developer", render: (b) => b.developer_id, width: 120 }]
            : []),
          { key: "open", label: "Open", width: 70, render: (b) => b.stats.open },
          {
            key: "overdue",
            label: "Overdue",
            width: 90,
            render: (b) =>
              b.stats.overdue > 0 ? (
                <span className="adm-badge adm-badge--esc-developer">{b.stats.overdue}</span>
              ) : (
                <span className="use">0</span>
              ),
          },
          { key: "resp", label: "Avg response", width: 120, render: (b) => fmtHours(b.stats.avg_response_hours) },
          {
            key: "close",
            label: "Close rate",
            width: 150,
            render: (b) =>
              b.stats.close_rate == null ? (
                <span className="use">—</span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="adm-meter"><span style={{ width: `${b.stats.close_rate}%` }} /></span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{b.stats.close_rate}%</span>
                </span>
              ),
          },
        ]}
      />
    </>
  );
}
