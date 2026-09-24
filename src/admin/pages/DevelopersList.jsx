import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, canCreateDevelopers, getSession, isReifgoAdmin } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";

export default function DevelopersList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  // "Mine": developers this REIFGO team member is account manager for.
  const [meId, setMeId] = useState(null);
  const [mineOnly, setMineOnly] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const mainAdmin = isReifgoAdmin(session);

  useEffect(() => {
    if (session?.role === "admin") return;
    api.get("/admin/me").then((m) => setMeId(m.id ?? null)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const mineCount = meId ? (rows ?? []).filter((r) => r.account_manager?.id === meId).length : 0;
  const shown = mineOnly && meId ? (rows ?? []).filter((r) => r.account_manager?.id === meId) : rows ?? [];

  const load = () =>
    api.get("/admin/developers").then(setRows).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    try {
      await api.del(`/admin/developers/${pendingDelete.id}`);
      toast.success(`Deleted “${pendingDelete.name}”`);
      setPendingDelete(null);
      load();
    } catch (e) {
      toast.error(e.message); // 409 message explains the property conflict
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Developers</h1>
          <p>Development companies in the app. Open one to see its profile, listings and sales team.</p>
        </div>
        {canCreateDevelopers(session) && (
          <Link className="adm-btn adm-btn--primary" to="/admin/developers/new">
            + New developer
          </Link>
        )}
      </header>

      {meId && (
        <div className="adm-tabs">
          <button className={`adm-tab${!mineOnly ? " is-active" : ""}`} onClick={() => setMineOnly(false)}>
            All <span className="adm-tab__count">{rows?.length ?? 0}</span>
          </button>
          <button className={`adm-tab${mineOnly ? " is-active" : ""}`} onClick={() => setMineOnly(true)}>
            My developers <span className="adm-tab__count">{mineCount}</span>
          </button>
        </div>
      )}

      <DataTable
        rows={shown}
        searchKeys={["name", "tagline", "region"]}
        searchPlaceholder="Search developers…"
        emptyText={rows === null ? "Loading…" : mineOnly ? "You're not the account manager for any developer yet." : "No developers yet."}
        onRowClick={(row) => navigate(`/admin/developers/${row.id}`)}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>
                  {r.name}
                  {r.approval_status === "pending" && <span className="adm-badge adm-badge--pending">Waiting for approval</span>}
                  {r.approval_status === "rejected" && <span className="adm-badge adm-badge--closed">Declined</span>}
                </strong>
                <span>{r.region ?? "No region"}</span>
              </div>
            ),
          },
          {
            key: "account_manager",
            label: "Account manager",
            sortValue: (r) => r.account_manager?.name,
            render: (r) => r.account_manager?.name ?? <span className="adm-muted">Not set</span>,
          },
          { key: "sales_manager", label: "Sales Manager", sortValue: (r) => r.sales_manager?.name, render: (r) => r.sales_manager?.name ?? <span className="adm-muted">Not set</span> },
          { key: "properties", sortValue: (r) => r._count?.properties ?? 0, label: "Listings", render: (r) => r._count?.properties ?? 0, width: 90 },
          { key: "team", sortValue: (r) => r._count?.brokers ?? 0, label: "Team", render: (r) => r._count?.brokers ?? 0, width: 80 },
          { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at), width: 120 },
          {
            key: "flags",
            sortValue: (r) => (r.is_approved ? 2 : 0) + (r.is_verified ? 1 : 0),
            label: "Flags",
            width: 160,
            render: (r) => (
              <span className="adm-flags">
                {r.is_verified && <span className="adm-badge adm-badge--active">Verified</span>}
                {r.is_approved && <span className="adm-badge adm-badge--contacted">In the app</span>}
              </span>
            ),
          },
          ...(!mainAdmin ? [] : [{
            key: "actions",
            label: "",
            width: 60,
            sortable: false,
            render: (r) => (
              <button
                className="adm-icon-btn adm-icon-btn--danger"
                aria-label={`Delete ${r.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(r);
                }}
              >
                🗑
              </button>
            ),
          }]),
        ]}
      />

      {pendingDelete && (
        <Modal
          title="Delete developer?"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--danger" onClick={confirmDelete}>
                Delete
              </button>
            </>
          }
        >
          <p>
            “{pendingDelete.name}” will be removed. If it still has properties,
            the delete is blocked until they're deleted or reassigned.
          </p>
        </Modal>
      )}
    </>
  );
}
