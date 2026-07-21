import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

const SCOPES = {
  insight: { label: "Insights", back: "/admin/insights" },
  forum: { label: "Forum", back: "/admin/forum" },
};

const EMPTY = { name: "", display_order: 0 };

export default function Categories() {
  const [params, setParams] = useSearchParams();
  const scope = SCOPES[params.get("scope")] ? params.get("scope") : "insight";
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () =>
    api
      .get(`/admin/categories?scope=${scope}`)
      .then(setRows)
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    setRows(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!editing.name.trim()) {
      toast.error("Give the category a name");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: editing.name.trim(),
        display_order: Number(editing.display_order) || 0,
      };
      if (editing.id) {
        await api.patch(`/admin/categories/${editing.id}`, payload);
        toast.success("Category saved");
      } else {
        // scope is fixed at creation — a category can't move between pages
        // without orphaning everything filed under it.
        await api.post("/admin/categories", { ...payload, scope });
        toast.success("Category created");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const confirmDelete = async () => {
    try {
      await api.del(`/admin/categories/${pendingDelete.id}`);
      toast.success(`Deleted “${pendingDelete.name}”`);
      setPendingDelete(null);
      load();
    } catch (e) {
      // The API refuses to delete a category that still has content filed
      // under it, rather than silently unfiling those records.
      toast.error(e.message);
    }
  };

  const usage = (r) => (r._count?.insights ?? 0) + (r._count?.threads ?? 0);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to={SCOPES[scope].back}>{SCOPES[scope].label}</Link>
            <span>/</span>
            <span>Categories</span>
          </nav>
          <h1>Categories</h1>
          <p>Used to group and filter content on the {SCOPES[scope].label} page.</p>
        </div>
        <button
          className="adm-btn adm-btn--primary"
          onClick={() => setEditing({ ...EMPTY })}
        >
          + New category
        </button>
      </header>

      <div className="adm-tabs" role="tablist">
        {Object.entries(SCOPES).map(([key, cfg]) => (
          <button
            key={key}
            role="tab"
            aria-selected={scope === key}
            className={`adm-tab${scope === key ? " adm-tab--on" : ""}`}
            onClick={() => setParams({ scope: key })}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "slug"]}
        searchPlaceholder="Search categories…"
        emptyText={rows === null ? "Loading…" : "No categories yet."}
        onRowClick={(row) =>
          setEditing({ id: row.id, name: row.name, display_order: row.display_order })
        }
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug", width: 180 },
          { key: "display_order", label: "Order", width: 80 },
          {
            key: "usage",
            label: "In use by",
            width: 110,
            render: (r) => {
              const n = usage(r);
              return n === 0 ? "—" : `${n} item${n === 1 ? "" : "s"}`;
            },
          },
          {
            key: "actions",
            label: "",
            width: 60,
            render: (r) => (
              <button
                className="adm-icon-btn adm-icon-btn--danger"
                aria-label={`Delete ${r.name}`}
                disabled={usage(r) > 0}
                title={
                  usage(r) > 0
                    ? "Reassign the content filed under this category first"
                    : undefined
                }
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

      {editing && (
        <Modal
          title={editing.id ? "Edit category" : "New category"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <form className="adm-form-grid" onSubmit={save}>
            <FormField
              label="Name"
              required
              value={editing.name}
              onChange={(v) => setEditing((c) => ({ ...c, name: v }))}
              span={2}
            />
            <FormField
              label="Display order"
              type="number"
              value={editing.display_order}
              onChange={(v) => setEditing((c) => ({ ...c, display_order: v }))}
              hint="Lower numbers come first"
            />
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <Modal
          title="Delete category?"
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
          <p>“{pendingDelete.name}” will be removed. This can't be undone.</p>
        </Modal>
      )}
    </>
  );
}
