import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import ChannelBadges from "../components/ChannelBadges.jsx";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { TIER_LABEL, channelsOf, contentSort, fmtDate } from "../contentUtils.js";

export default function ForumList() {
  const [rows, setRows] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = () =>
    api
      .get("/admin/forum/threads")
      .then((r) => setRows([...r].sort(contentSort)))
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    try {
      await api.del(`/admin/forum/threads/${pendingDelete.id}`);
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
          <h1>Forum</h1>
          <p>
            Discussion threads shown on the website and in the app, listed in the
            order they'll appear.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/categories?scope=forum">
            Categories
          </Link>
          <Link className="adm-btn adm-btn--primary" to="/admin/forum/new">
            + New thread
          </Link>
        </div>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["title", "author_name"]}
        searchPlaceholder="Search threads…"
        emptyText={rows === null ? "Loading…" : "No threads yet."}
        onRowClick={(row) => navigate(`/admin/forum/${row.id}`)}
        columns={[
          {
            key: "title",
            label: "Thread",
            render: (r) => (
              <span>
                {r.is_pinned && (
                  <span className="adm-pin" title="Pinned">
                    {"📌 "}
                  </span>
                )}
                {r.title}
                {r.is_featured && (
                  <span className="adm-star" title="Featured">
                    {" ★"}
                  </span>
                )}
                {r.is_locked && (
                  <span className="adm-lock" title="Locked — no new replies">
                    {" 🔒"}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "tier",
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
            label: "Category",
            width: 150,
            render: (r) => r.category?.name ?? "—",
          },
          { key: "display_order", label: "Order", width: 70 },
          {
            key: "replies",
            label: "Replies",
            width: 80,
            render: (r) => r._count?.posts ?? 0,
          },
          { key: "author_name", label: "Started by", render: (r) => r.author_name ?? "—" },
          {
            key: "channels",
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
          title="Delete thread?"
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
            “{pendingDelete.title}” and its{" "}
            {pendingDelete._count?.posts ?? 0} repl
            {(pendingDelete._count?.posts ?? 0) === 1 ? "y" : "ies"} will be
            permanently removed from the website and the app. This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
