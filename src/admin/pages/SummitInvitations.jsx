import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function SummitInvitations() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const toast = useToast();

  const load = () =>
    api
      .get("/admin/summit/invitations")
      .then(setRows)
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleHandled = async (row) => {
    try {
      const updated = await api.patch(`/admin/summit/invitations/${row.id}`, {
        handled: !row.handled,
      });
      toast.success(updated.handled ? "Marked as handled" : "Reopened");
      // Keep the detail modal in step with the row it's showing.
      setOpen((o) => (o && o.id === row.id ? { ...o, handled: updated.handled } : o));
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const pending = (rows ?? []).filter((r) => !r.handled).length;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to="/admin/summit">Forum</Link>
            <span>/</span>
            <span>Invitation requests</span>
          </nav>
          <h1>Invitation requests</h1>
          <p>
            {rows === null
              ? "Loading…"
              : pending === 0
                ? "Everything here has been handled."
                : `${pending} awaiting a response.`}
          </p>
        </div>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["full_name", "email", "company", "role"]}
        searchPlaceholder="Search requests…"
        emptyText={rows === null ? "Loading…" : "No requests yet."}
        onRowClick={setOpen}
        columns={[
          {
            key: "full_name",
            label: "Name",
            render: (r) => (
              <span>
                {r.full_name}
                {!r.handled && <span className="adm-star" title="Awaiting response">{" ●"}</span>}
              </span>
            ),
          },
          { key: "email", label: "Email" },
          { key: "company", label: "Company", render: (r) => r.company ?? "—" },
          { key: "role", label: "Role", render: (r) => r.role ?? "—", width: 150 },
          {
            key: "created_at",
            label: "Received",
            width: 170,
            render: (r) => fmtDateTime(r.created_at),
          },
          {
            key: "handled",
            label: "Status",
            width: 120,
            render: (r) => (
              <span className={`adm-badge adm-badge--${r.handled ? "active" : "pending"}`}>
                {r.handled ? "Handled" : "New"}
              </span>
            ),
          },
        ]}
      />

      {open && (
        <Modal
          title={open.full_name}
          onClose={() => setOpen(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setOpen(null)}>
                Close
              </button>
              <button className="adm-btn adm-btn--primary" onClick={() => toggleHandled(open)}>
                {open.handled ? "Reopen" : "Mark handled"}
              </button>
            </>
          }
        >
          <dl className="adm-kv">
            <dt>Email</dt>
            {/* The only action an admin needs from here is to reply. */}
            <dd>
              <a href={`mailto:${open.email}`}>{open.email}</a>
            </dd>
            <dt>Company</dt>
            <dd>{open.company || "—"}</dd>
            <dt>Role</dt>
            <dd>{open.role || "—"}</dd>
            <dt>Received</dt>
            <dd>{fmtDateTime(open.created_at)}</dd>
          </dl>
          {open.message && (
            <>
              <p className="adm-field__label" style={{ marginTop: 16 }}>
                Message
              </p>
              <p className="adm-reply__body">{open.message}</p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
