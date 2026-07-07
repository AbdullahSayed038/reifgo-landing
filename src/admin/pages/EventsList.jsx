import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function EventsList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = () =>
    api.get("/admin/events").then(setRows).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    try {
      await api.del(`/admin/events/${pendingDelete.id}`);
      toast.success(`Deleted “${pendingDelete.title}”`);
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
          <h1>Events</h1>
          <p>Forums, roadshows and webinars users can register for.</p>
        </div>
        <Link className="adm-btn adm-btn--primary" to="/admin/events/new">
          + New event
        </Link>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["title", "location"]}
        searchPlaceholder="Search events…"
        emptyText={rows === null ? "Loading…" : "No events yet."}
        onRowClick={(row) => navigate(`/admin/events/${row.id}`)}
        columns={[
          { key: "title", label: "Title" },
          { key: "date", label: "When", render: (r) => fmtDate(r.date) },
          { key: "location", label: "Location", render: (r) => r.location ?? "—" },
          { key: "type", label: "Type", render: (r) => <StatusBadge value={r.type} />, width: 110 },
          { key: "registrations", label: "Registered", render: (r) => r._count?.registrations ?? 0, width: 100 },
          {
            key: "actions",
            label: "",
            width: 60,
            render: (r) => (
              <button
                className="adm-icon-btn adm-icon-btn--danger"
                aria-label={`Delete ${r.title}`}
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
          title="Delete event?"
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
            “{pendingDelete.title}” and its {pendingDelete._count?.registrations ?? 0}{" "}
            registration(s) will be removed. This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
