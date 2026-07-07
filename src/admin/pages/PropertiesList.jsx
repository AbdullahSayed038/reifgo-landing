import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";

const fmtPrice = (v) =>
  v == null ? "—" : `$${Number(v).toLocaleString()}`;

export default function PropertiesList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

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
          <h1>Properties</h1>
          <p>Listings shown in the REIFGO app.</p>
        </div>
        <Link className="adm-btn adm-btn--primary" to="/admin/properties/new">
          + New property
        </Link>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "location", "developer.name", "asset_class"]}
        searchPlaceholder="Search properties…"
        emptyText={rows === null ? "Loading…" : "No properties yet."}
        onRowClick={(row) => navigate(`/admin/properties/${row.id}`)}
        columns={[
          { key: "name", label: "Name" },
          { key: "developer", label: "Developer", render: (r) => r.developer?.name ?? "—" },
          { key: "location", label: "Location", render: (r) => r.location ?? "—" },
          { key: "min_entry_price", label: "Min entry", render: (r) => fmtPrice(r.min_entry_price) },
          { key: "media", label: "Media", render: (r) => r.media?.length ?? 0, width: 70 },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} />, width: 120 },
          {
            key: "actions",
            label: "",
            width: 60,
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
