import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

export default function DevelopersList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

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
          <p>Development companies featured in the app.</p>
        </div>
        <Link className="adm-btn adm-btn--primary" to="/admin/developers/new">
          + New developer
        </Link>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "tagline"]}
        searchPlaceholder="Search developers…"
        emptyText={rows === null ? "Loading…" : "No developers yet."}
        onRowClick={(row) => navigate(`/admin/developers/${row.id}`)}
        columns={[
          { key: "name", label: "Name" },
          { key: "tagline", label: "Tagline", render: (r) => r.tagline ?? "—" },
          { key: "properties", label: "Properties", render: (r) => r._count?.properties ?? 0, width: 100 },
          {
            key: "flags",
            label: "Flags",
            width: 160,
            render: (r) => (
              <span className="adm-flags">
                {r.is_verified && <span className="adm-badge adm-badge--active">Verified</span>}
                {r.is_approved && <span className="adm-badge adm-badge--contacted">Approved</span>}
              </span>
            ),
          },
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
