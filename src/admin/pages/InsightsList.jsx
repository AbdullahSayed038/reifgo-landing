import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getSession } from "../api.js";
import ChannelBadges from "../components/ChannelBadges.jsx";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

export default function InsightsList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const isDeveloper = getSession()?.role === "developer";

  const load = () =>
    api.get("/admin/insights").then(setRows).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    try {
      await api.del(`/admin/insights/${pendingDelete.id}`);
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
          <h1>Insights</h1>
          <p>
            {isDeveloper
              ? "Articles and reports published under your company."
              : "Articles and reports shown on the website and in the app."}
          </p>
        </div>
        <Link className="adm-btn adm-btn--primary" to="/admin/insights/new">
          + New insight
        </Link>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["title", "category", "author_name"]}
        searchPlaceholder="Search insights…"
        emptyText={rows === null ? "Loading…" : "No insights yet."}
        onRowClick={(row) => navigate(`/admin/insights/${row.id}`)}
        columns={[
          {
            key: "title",
            label: "Title",
            render: (r) => (
              <div className="adm-cell-media">
                {r.cover_url ? (
                  <img className="adm-thumb" src={r.cover_url} alt="" loading="lazy" />
                ) : (
                  <span className="adm-thumb adm-thumb--empty" />
                )}
                <span>{r.title}</span>
              </div>
            ),
          },
          { key: "category", label: "Category", width: 130 },
          { key: "author_name", label: "Author", render: (r) => r.author_name ?? "—" },
          {
            key: "channels",
            label: "Where",
            width: 110,
            render: (r) => <ChannelBadges channels={r.channels} />,
          },
          {
            key: "published",
            label: "Status",
            width: 110,
            render: (r) => (
              <span className={`adm-badge adm-badge--${r.published ? "active" : "pending"}`}>
                {r.published ? "Published" : "Draft"}
              </span>
            ),
          },
          { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at), width: 110 },
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
          title="Delete insight?"
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
            “{pendingDelete.title}” will disappear from everywhere it's
            published. This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
