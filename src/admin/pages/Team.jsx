import { useEffect, useState } from "react";
import { api, can, getSession, isReifgoTier, permissionTitle } from "../api.js";
import DistributionPanel from "../components/DistributionPanel.jsx";
import SalesManagerPicker from "../components/SalesManagerPicker.jsx";
import DataTable from "../components/DataTable.jsx";
import Presence from "../components/Presence.jsx";
import StatCard from "../components/StatCard.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtHours, initials } from "../leadUtils.js";
import BrokerDialog from "../components/BrokerDialog.jsx";
import { fmtDate } from "../contentUtils.js";

export default function Team() {
  const [brokers, setBrokers] = useState(null);
  const [editing, setEditing] = useState(null); // broker object, or {} for new
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();
  const session = getSession();
  const isAdmin = isReifgoTier(session);
  // Team accounts without manage_team see the desk but can't change it; the
  // server refuses these writes either way.
  const canManage = can("manage_team");
  const canDistribute = can("assign_leads");
  const [distDeveloper, setDistDeveloper] = useState("");
  // A developer's own team page shows who their Sales Manager is.
  const [myDeveloper, setMyDeveloper] = useState(null);
  useEffect(() => {
    if (isAdmin || !session?.developer_id) return;
    api.get(`/admin/developers/${session.developer_id}`).then(setMyDeveloper).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <h1>{isAdmin ? "Sales Teams" : "Team"}</h1>
          <p>
            {isAdmin
              ? "Developers' sales staff (Sales Managers and Sales Agents) who log in to the CMS to work leads. People who use the app are under App Users."
              : "Your team accounts and how they're performing. New accounts can sign in once REIFGO approves them."}
          </p>
        </div>
        {canManage && (
          <button className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
            + Add team member
          </button>
        )}
      </header>

      <div className="adm-stat-grid">
        <StatCard label="Team members" value={brokers?.length} />
        <StatCard label="Open leads" value={totals.open} />
        <StatCard label="Needs Attention" value={totals.overdue} />
        <StatCard label="Team close rate" value={teamCloseRate == null ? "—" : `${teamCloseRate}%`} />
      </div>

      {!isAdmin && myDeveloper && (
        <SalesManagerPicker developer={myDeveloper} team={brokers} onChanged={setMyDeveloper} />
      )}

      {canDistribute && (
        <>
          {isAdmin && (
            <div className="adm-filters" style={{ marginBottom: 12 }}>
              <select
                className="adm-inline-select"
                value={distDeveloper}
                aria-label="Developer for lead distribution"
                onChange={(e) => setDistDeveloper(e.target.value)}
              >
                <option value="">Lead distribution for…</option>
                {[...new Map((brokers ?? []).map((b) => [b.developer_id, b.developer_name])).entries()].map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}
          {(!isAdmin || distDeveloper) && (
            <DistributionPanel developerId={isAdmin ? distDeveloper : undefined} onChanged={reload} />
          )}
        </>
      )}

      <DataTable
        rows={brokers ?? []}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search the team…"
        emptyText={brokers === null ? "Loading…" : "No team members yet."}
        groupBy={isAdmin ? (b) => b.developer_name || b.developer_id : undefined}
        columns={[
          {
            key: "name",
            label: "Team member",
            render: (b) => (
              <span className="adm-broker-name">
                <span className={`adm-avatar${b.is_active ? "" : " adm-avatar--off"}`}>
                  {initials(b.name)}
                </span>
                <span className="adm-cell-stack">
                  <strong>
                    {b.name}
                    {!b.is_active && <span className="adm-badge adm-badge--muted">Deactivated</span>}
                    {b.approval_status === "pending" && <span className="adm-badge adm-badge--pending">Waiting for REIFGO</span>}
                    {b.approval_status === "rejected" && (
                      <span className="adm-badge adm-badge--closed" title={b.rejection_reason ?? ""}>Declined</span>
                    )}
                    {b.permissions_requested_at && (
                      <span className="adm-badge adm-badge--assigned" title={`Asked for ${permissionTitle(b.pending_permissions)} access`}>
                        Access change waiting
                      </span>
                    )}
                  </strong>
                  <span>
                    {permissionTitle(b.permissions)}
                    {b.position && b.position !== permissionTitle(b.permissions) ? ` · ${b.position}` : ""} · {b.email}
                  </span>
                  {b.approval_status === "rejected" && b.rejection_reason && (
                    <span>Reason: {b.rejection_reason}</span>
                  )}
                </span>
              </span>
            ),
          },
          {
            key: "last_seen_at",
            label: "Last seen",
            width: 150,
            sortValue: (b) => (b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0),
            render: (b) => <Presence at={b.last_seen_at} />,
          },
          // The developer is the group band now, so it does not also need a
          // column repeating it on every row.
          { key: "open", sortValue: (b) => b.stats.open, label: "Open", width: 70, render: (b) => b.stats.open },
          {
            key: "overdue",
            sortValue: (b) => b.stats.overdue,
            label: "Needs Attention",
            width: 90,
            render: (b) =>
              b.stats.overdue > 0 ? (
                <span className="adm-badge adm-badge--esc-developer">{b.stats.overdue}</span>
              ) : (
                <span className="use">0</span>
              ),
          },
          { key: "resp", sortValue: (b) => b.stats.avg_response_hours, label: "Avg response", width: 120, render: (b) => fmtHours(b.stats.avg_response_hours) },
          {
            key: "close",
            sortValue: (b) => b.stats.close_rate,
            label: "Close rate",
            width: 120,
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
          { key: "created_at", label: "Added", width: 105, render: (b) => <span style={{ whiteSpace: "nowrap" }}>{fmtDate(b.created_at)}</span> },
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
