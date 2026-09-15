import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getSession } from "../api.js";
import ChannelBadges from "../components/ChannelBadges.jsx";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { TIER_LABEL, channelsOf, contentSort, fmtDate } from "../contentUtils.js";

export default function InsightsList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const isDeveloper = getSession()?.role === "developer";

  const load = () =>
    api
      .get("/admin/insights")
      // Mirror the public ordering so the list doubles as a preview of the page.
      .then((r) => setRows([...r].sort(contentSort)))
      .catch((e) => toast.error(e.message));

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
              : "Articles and reports shown on the website and in the app, listed in the order they'll appear."}
          </p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/categories?scope=insight">
            Categories
          </Link>
          <Link className="adm-btn adm-btn--primary" to="/admin/insights/new">
            + New insight
          </Link>
        </div>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["title", "author_name"]}
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
                <span>
                  {r.title}
                  {r.is_featured && (
                    <span className="adm-star" title="Featured">
                      {" ★"}
                    </span>
                  )}
                </span>
              </div>
            ),
          },
          {
            key: "tier",
            sortValue: (r) => r.tier,
            label: "Tier",
            width: 100,
            render: (r) => (
              <span className={`adm-badge adm-badge--tier-${r.tier}`}>
                {TIER_LABEL[r.tier] ?? r.tier}
              </span>
            ),
          },
          {
            key: "category",
            sortValue: (r) => r.category?.name,
            label: "Category",
            width: 130,
            render: (r) => r.category?.name ?? "—",
          },
          { key: "display_order", label: "Order", width: 70 },
          { key: "author_name", label: "Author", render: (r) => r.author_name ?? "—" },
          {
            key: "channels",
            sortValue: (r) => (r.show_on_app ? 2 : 0) + (r.show_on_website ? 1 : 0),
            label: "Where",
            width: 110,
            render: (r) => <ChannelBadges channels={channelsOf(r)} />,
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
          {
            key: "published_at",
            sortValue: (r) => r.published_at ?? r.created_at,
            label: "Date",
            width: 110,
            render: (r) => fmtDate(r.published_at ?? r.created_at),
          },
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
            “{pendingDelete.title}” will disappear from the website and the app.
            This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
