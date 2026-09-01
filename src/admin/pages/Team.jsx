import { useEffect, useState } from "react";
import { api, getSession } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import StatCard from "../components/StatCard.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtHours, initials } from "../leadUtils.js";
import BrokerDialog from "../components/BrokerDialog.jsx";

export default function Team() {
  const [brokers, setBrokers] = useState(null);
  const [editing, setEditing] = useState(null); // broker object, or {} for new
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();
  const session = getSession();
  const isAdmin = session?.role === "admin";
  // Brokers can see their desk but not manage it; the server refuses these
  // writes either way, this just keeps the controls out of the way.
  const canManage = session?.role !== "broker";

  const reload = () =>
    api.get("/admin/brokers").then(setBrokers).catch((e) => toast.error(e.message));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (b) => {
    setBusyId(b.id);
    try {
      await api.patch(`/admin/brokers/${b.id}`, { is_active: !b.is_active });
      toast.success(b.is_active ? `${b.name} deactivated` : `${b.name} reactivated`);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Remove ${b.name}? This cannot be undone.`)) return;
    setBusyId(b.id);
    try {
      await api.del(`/admin/brokers/${b.id}`);
      toast.success(`${b.name} removed`);
      await reload();
    } catch (e) {
      // The server refuses to delete a broker holding live leads and says how
      // many; surfacing that verbatim is more useful than "failed".
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

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
        {canManage && (
          <button className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
            + Add broker
          </button>
        )}
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
        groupBy={isAdmin ? (b) => b.developer_name || b.developer_id : undefined}
        columns={[
          {
            key: "name",
            label: "Broker",
            render: (b) => (
              <span className="adm-broker-name">
                <span className={`adm-avatar${b.is_active ? "" : " adm-avatar--off"}`}>
                  {initials(b.name)}
                </span>
                <span className="adm-cell-stack">
                  <strong>
                    {b.name}
                    {!b.is_active && <span className="adm-badge adm-badge--muted">Deactivated</span>}
                  </strong>
                  <span>{b.position ? `${b.position} · ${b.email}` : b.email}</span>
                </span>
              </span>
            ),
          },
          // The developer is the group band now, so it does not also need a
          // column repeating it on every row.
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
          ...(canManage
            ? [
                {
                  key: "manage",
                  label: "",
                  width: 190,
                  render: (b) => (
                    <div className="adm-row-actions">
                      <button
                        type="button"
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        onClick={() => setEditing(b)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        disabled={busyId === b.id}
                        onClick={() => toggleActive(b)}
                      >
                        {b.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="adm-icon-btn adm-icon-btn--danger"
                        aria-label={`Remove ${b.name}`}
                        disabled={busyId === b.id}
                        onClick={() => remove(b)}
                      >
                        ✕
                      </button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />

      {editing && (
        <BrokerDialog
          broker={editing}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </>
  );
}
