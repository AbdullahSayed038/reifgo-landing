import { useEffect, useState } from "react";
import { api, can, getSession, isReifgoAdmin, permissionTitle } from "../api.js";
import DistributionPanel from "../components/DistributionPanel.jsx";
import DataTable from "../components/DataTable.jsx";
import Presence from "../components/Presence.jsx";
import StatCard from "../components/StatCard.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtHours, initials } from "../leadUtils.js";
import BrokerDialog from "../components/BrokerDialog.jsx";
import { fmtDate } from "../contentUtils.js";

/**
 * REIFGO's sales team (Syed, Oct 6): Sales Managers and Sales Agents who work
 * every lead. Developers no longer have teams of their own; an agent can
 * cover certain developers so rotation sends those leads to them first.
 */
export default function Team() {
  const [brokers, setBrokers] = useState(null);
  const [editing, setEditing] = useState(null); // broker object, or {} for new
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();
  const session = getSession();
  // Main REIFGO admins and Sales Managers run the team; everyone else sees it.
  // The server refuses these writes either way.
  const canManage = isReifgoAdmin(session) || (session?.role === "broker" && can("manage_team", session));
  const canDistribute = isReifgoAdmin(session) || (session?.role === "broker" && can("assign_leads", session));

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
      // The server refuses to delete someone holding live leads and says how
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
  const managers = (brokers ?? []).filter((b) => (b.permissions ?? []).includes("assign_leads")).length;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Sales Team</h1>
          <p>
            REIFGO's Sales Managers and Sales Agents. They work every lead, from the app and the website. Investors who
            use the app are under Investors; REIFGO's admins and support are under REIFGO Team.
          </p>
        </div>
        {canManage && (
          <button className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
            + Add to the team
          </button>
        )}
      </header>

      <div className="adm-stat-grid">
        <StatCard label="Team members" value={brokers?.length} hint={brokers ? `${managers} Sales Manager${managers === 1 ? "" : "s"}` : undefined} />
        <StatCard label="Open leads" value={totals.open} />
        <StatCard label="Needs Attention" value={totals.overdue} accent={totals.overdue > 0} />
        <StatCard label="Team close rate" value={teamCloseRate == null ? "—" : `${teamCloseRate}%`} />
      </div>

      {canDistribute && <DistributionPanel onChanged={reload} />}

      <DataTable
        rows={brokers ?? []}
        searchKeys={["name", "email", "position"]}
        searchPlaceholder="Search the team…"
        emptyText={brokers === null ? "Loading…" : "No one on the sales team yet."}
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
                    {b.approval_status === "pending" && <span className="adm-badge adm-badge--pending">Waiting for a REIFGO admin</span>}
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
            key: "covers",
            label: "Covers",
            width: 200,
            sortValue: (b) => (b.covers ?? []).map((d) => d.name).join(", ") || null,
            render: (b) =>
              (b.covers ?? []).length ? (
                <span className="adm-link-list">{b.covers.map((d) => d.name).join(", ")}</span>
              ) : (
                <span className="use">Any developer</span>
              ),
          },
          {
            key: "last_seen_at",
            label: "Last seen",
            width: 150,
            sortValue: (b) => (b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0),
            render: (b) => <Presence at={b.last_seen_at} />,
          },
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
          { key: "resp", sortValue: (b) => b.stats.avg_response_hours, label: "Avg response", width: 110, render: (b) => fmtHours(b.stats.avg_response_hours) },
          {
            key: "close",
            sortValue: (b) => b.stats.close_rate,
            label: "Close rate",
            width: 110,
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
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setEditing(b)}>
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
