import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, can, getSession, isReifgoTier } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";
import { useCurrency } from "../currency.jsx";

export default function PropertiesList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { fmtMoney } = useCurrency();
  const reifgo = isReifgoTier();

  const load = () =>
    api.get("/admin/properties").then(setRows).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    try {
      await api.del(`/admin/properties/${pendingDelete.id}`);
      toast.success(`Deleted “${pendingDelete.name}”`);
      setPendingDelete(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>{reifgo ? "Properties" : "My Properties"}</h1>
          <p>
            {reifgo
              ? "Listings shown in the REIFGO app."
              : "New listings and changes to live ones go to REIFGO for approval before they show in the app."}
          </p>
        </div>
        {can("manage_properties") && (
          <Link className="adm-btn adm-btn--primary" to="/admin/properties/new">
            + New property
          </Link>
        )}
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "location", "developer.name", "asset_class"]}
        searchPlaceholder="Search properties…"
        emptyText={rows === null ? "Loading…" : "No properties yet."}
        onRowClick={(row) => navigate(`/admin/properties/${row.id}`)}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (r) => (
              <div className="adm-cell-media">
                {r.media?.[0] ? (
                  <img className="adm-thumb" src={r.media[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="adm-thumb adm-thumb--empty" />
                )}
                <span>{r.name}</span>
              </div>
            ),
          },
          { key: "developer", sortValue: (r) => r.developer?.name, label: "Developer", render: (r) => r.developer?.name ?? "—" },
          { key: "location", label: "Location", render: (r) => r.location ?? "—" },
          { key: "min_entry_price", label: "Min entry", render: (r) => fmtMoney(r.min_entry_price) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} />, width: 120 },
          {
            key: "approval",
            sortValue: (r) => (r.approval_status === "pending" ? 0 : r.approval_status === "rejected" ? 1 : r.has_pending_changes ? 2 : 3),
            label: "Approval",
            width: 150,
            render: (r) =>
              r.approval_status === "pending" ? (
                <span className="adm-badge adm-badge--pending">Waiting for REIFGO</span>
              ) : r.approval_status === "rejected" ? (
                <span className="adm-badge adm-badge--closed" title={r.rejection_reason ?? ""}>Declined</span>
              ) : r.has_pending_changes ? (
                <span className="adm-badge adm-badge--assigned">Changes waiting</span>
              ) : (
                <span className="adm-badge adm-badge--active">Live</span>
              ),
          },
          {
            key: "actions",
            label: "",
            width: 60,
            render: (r) => (reifgo || (can("manage_properties") && r.approval_status !== "approved")) && (
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
          },
        ]}
      />

      {pendingDelete && (
        <Modal
          title="Delete property?"
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
            “{pendingDelete.name}” will be removed from the app, along with its
            media, ROI figures, saved bookmarks and leads. This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
