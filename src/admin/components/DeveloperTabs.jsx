import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, permissionTitle } from "../api.js";
import { fmtDate } from "../contentUtils.js";
import { useCurrency } from "../currency.jsx";
import BrokerDialog from "./BrokerDialog.jsx";
import DataTable from "./DataTable.jsx";
import Presence from "./Presence.jsx";
import DistributionPanel from "./DistributionPanel.jsx";
import SalesManagerPicker from "./SalesManagerPicker.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useToast } from "./Toast.jsx";

const approvalBadge = (r) =>
  r.approval_status === "pending" ? (
    <span className="adm-badge adm-badge--pending">Waiting for REIFGO</span>
  ) : r.approval_status === "rejected" ? (
    <span className="adm-badge adm-badge--closed" title={r.rejection_reason ?? ""}>Declined</span>
  ) : r.has_pending_changes ? (
    <span className="adm-badge adm-badge--assigned">Changes waiting</span>
  ) : (
    <span className="adm-badge adm-badge--active">Live</span>
  );

/** A developer's listings, on their page (Syed: no separate Properties page). */
export function DeveloperListings({ developerId }) {
  const [rows, setRows] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { fmtMoney } = useCurrency();

  useEffect(() => {
    api.get(`/admin/properties?developer_id=${encodeURIComponent(developerId)}`).then(setRows).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId]);

  return (
    <>
      <div className="adm-filters" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <Link className="adm-btn adm-btn--primary" to={`/admin/properties/new?developer=${encodeURIComponent(developerId)}`}>
          + New listing
        </Link>
      </div>
      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "location"]}
        searchPlaceholder="Search listings…"
        emptyText={rows === null ? "Loading…" : "No listings yet."}
        onRowClick={(r) => navigate(`/admin/properties/${r.id}`)}
        columns={[
          {
            key: "name",
            label: "Listing",
            render: (r) => (
              <div className="adm-cell-media">
                {r.media?.[0] ? <img className="adm-thumb" src={r.media[0].url} alt="" loading="lazy" /> : <span className="adm-thumb adm-thumb--empty" />}
                <span>{r.name}</span>
              </div>
            ),
          },
          { key: "location", label: "Location", render: (r) => r.location ?? "—" },
          { key: "min_entry_price", label: "From", render: (r) => fmtMoney(r.min_entry_price, r.currency) },
          { key: "status", label: "Status", width: 120, render: (r) => <StatusBadge value={r.status} /> },
          {
            key: "approval",
            label: "Approval",
            width: 150,
            sortValue: (r) => (r.approval_status === "pending" ? 0 : r.approval_status === "rejected" ? 1 : r.has_pending_changes ? 2 : 3),
            render: approvalBadge,
          },
          { key: "created_at", label: "Added", width: 110, render: (r) => fmtDate(r.created_at) },
        ]}
      />
    </>
  );
}

/** A developer's sales team, Sales Manager and lead distribution, on their page. */
export function DeveloperTeam({ developer, onDeveloperChange }) {
  const [team, setTeam] = useState(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  const load = () =>
    api.get(`/admin/brokers?developer_id=${encodeURIComponent(developer.id)}`).then(setTeam).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developer.id]);

  return (
    <>
      <SalesManagerPicker developer={developer} team={team} onChanged={onDeveloperChange} />
      <DistributionPanel developerId={developer.id} onChanged={load} />
      <div className="adm-filters" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <Link to="/admin/team" className="adm-tl__meta">Open all Sales Teams</Link>
        <button className="adm-btn adm-btn--primary" onClick={() => setAdding(true)}>+ Add team member</button>
      </div>
      <DataTable
        rows={team ?? []}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search the team…"
        emptyText={team === null ? "Loading…" : "No team members yet."}
        columns={[
          {
            key: "name",
            label: "Team member",
            render: (b) => (
              <div className="adm-cell-stack">
                <strong>
                  {b.name}
                  {developer.sales_manager?.id === b.id && <span className="adm-badge adm-badge--active">Sales Manager</span>}
                  {b.approval_status === "pending" && <span className="adm-badge adm-badge--pending">Waiting for REIFGO</span>}
                  {b.approval_status === "rejected" && <span className="adm-badge adm-badge--closed">Declined</span>}
                  {!b.is_active && <span className="adm-badge adm-badge--muted">Deactivated</span>}
                  {b.permissions_requested_at && <span className="adm-badge adm-badge--assigned">Access change waiting</span>}
                </strong>
                <span>{b.email}</span>
              </div>
            ),
          },
          { key: "access", label: "Access", width: 150, sortValue: (b) => permissionTitle(b.permissions), render: (b) => permissionTitle(b.permissions) },
          {
            key: "last_seen_at",
            label: "Last seen",
            width: 150,
            sortValue: (b) => (b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0),
            render: (b) => <Presence at={b.last_seen_at} />,
          },
          { key: "open", label: "Open leads", width: 100, sortValue: (b) => b.stats.open, render: (b) => b.stats.open },
          { key: "created_at", label: "Added", width: 110, render: (b) => fmtDate(b.created_at) },
        ]}
      />
      {adding && (
        <BrokerDialog
          broker={{ developer_id: developer.id }}
          isAdmin={false}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </>
  );
}
