import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, permissionTitle } from "../api.js";
import { fmtDate } from "../contentUtils.js";
import { useCurrency } from "../currency.jsx";
import DataTable from "./DataTable.jsx";
import Presence from "./Presence.jsx";
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

/**
 * REIFGO's sales agents who cover this developer (Oct 6: developers have no
 * teams of their own). Auto rotation sends this developer's leads to them
 * first. Coverage is set on the Sales Team page.
 */
export function DeveloperAgents({ developer }) {
  const [team, setTeam] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api
      .get(`/admin/brokers?developer_id=${encodeURIComponent(developer.id)}`)
      .then((rows) => setTeam(rows.filter((b) => (b.approval_status ?? "approved") === "approved")))
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developer.id]);

  return (
    <>
      <div className="adm-filters" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <p className="adm-tl__meta" style={{ margin: 0 }}>
          REIFGO agents covering {developer.name.replace(/\s+/g, " ")}. Their leads go to these agents first when auto rotation is on.
        </p>
        <Link to="/admin/team" className="adm-btn adm-btn--ghost">Manage on Sales Team</Link>
      </div>
      <DataTable
        rows={team ?? []}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search agents…"
        emptyText={team === null ? "Loading…" : "No agents cover this developer yet, so its leads can go to anyone on the team."}
        columns={[
          {
            key: "name",
            label: "Agent",
            render: (b) => (
              <div className="adm-cell-stack">
                <strong>
                  {b.name}
                  {!b.is_active && <span className="adm-badge adm-badge--muted">Deactivated</span>}
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
    </>
  );
}
