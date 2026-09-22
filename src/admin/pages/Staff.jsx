import { useEffect, useState } from "react";
import { api, getSession } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";

const ROLE_LABEL = { reifgo_admin: "REIFGO admin", regional_admin: "Regional admin" };
const EMPTY = { name: "", email: "", role: "reifgo_admin", region: "", password: "" };

// REIFGO's own staff accounts (AdminAccount). Only a REIFGO admin can add or
// change them; a regional admin sees just their own row.
export default function Staff() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // {} new, or a row
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const session = getSession();
  const canManage = session?.role === "admin" || session?.role === "reifgo_admin";
  const [mine, setMine] = useState(null);
  useEffect(() => {
    api.get("/admin/me").then((m) => setMine(m.email ?? null)).catch(() => {});
  }, []);

  const load = () => api.get("/admin/accounts").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (row) => {
    setEditing(row);
    setForm(row.id ? { name: row.name, email: row.email, role: row.role, region: row.region ?? "", password: "" } : EMPTY);
  };
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (busy) return;
    const isNew = !editing.id;
    if (isNew && form.password.length < 8) return toast.error("Set a password of at least 8 characters");
    if (!isNew && form.password && form.password.length < 8) return toast.error("A password needs at least 8 characters");
    setBusy(true);
    const body = {
      name: form.name.trim(),
      role: form.role,
      ...(form.role === "regional_admin" ? { region: form.region.trim() } : {}),
      // A REIFGO admin can change someone else's email, never their own.
      ...(isNew || editing.email !== mine ? { email: form.email.trim() } : {}),
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (isNew) await api.post("/admin/accounts", body);
      else await api.patch(`/admin/accounts/${editing.id}`, body);
      toast.success(isNew ? "Account added" : "Account saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const toggle = async (row) => {
    try {
      await api.patch(`/admin/accounts/${row.id}`, { is_active: !row.is_active });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>REIFGO Team</h1>
          <p>REIFGO's own staff accounts. They approve developer requests and manage events.</p>
        </div>
        {canManage && (
          <button className="adm-btn adm-btn--primary" onClick={() => open({})}>+ Add account</button>
        )}
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "email", "region"]}
        searchPlaceholder="Search accounts…"
        emptyText={rows === null ? "Loading…" : "No REIFGO accounts yet. The shared owner login still works."}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>
                  {r.name}
                  {!r.is_active && <span className="adm-badge adm-badge--muted">Deactivated</span>}
                </strong>
                <span>{r.email}</span>
              </div>
            ),
          },
          { key: "role", label: "Role", width: 150, render: (r) => ROLE_LABEL[r.role] ?? r.role },
          { key: "region", label: "Region", width: 120, render: (r) => r.region ?? "All" },
          { key: "created_at", label: "Created", width: 120, render: (r) => fmtDate(r.created_at) },
          ...(canManage
            ? [
                {
                  key: "actions",
                  label: "",
                  width: 200,
                  render: (r) => (
                    <div className="adm-row-actions">
                      <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => open(r)}>Edit</button>
                      <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => toggle(r)}>
                        {r.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name}` : "Add REIFGO account"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>
                {busy ? "Saving…" : editing.id ? "Save changes" : "Add account"}
              </button>
            </>
          }
        >
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.name} onChange={set("name")} span={2} />
            {editing.id && editing.email === mine ? (
              <label className="adm-field adm-field--span2">
                <span className="adm-field__label">Email</span>
                <input value={form.email} disabled readOnly />
                <span className="adm-field__hint">You can't change your own email. Another REIFGO admin can.</span>
              </label>
            ) : (
              <FormField label="Email" required value={form.email} onChange={set("email")} span={2} />
            )}
            <FormField
              label="Role"
              type="select"
              value={form.role}
              onChange={set("role")}
              options={[
                { value: "reifgo_admin", label: "REIFGO admin (everything)" },
                { value: "regional_admin", label: "Regional admin (one region)" },
              ]}
            />
            {form.role === "regional_admin" && (
              <FormField label="Region" required value={form.region} onChange={set("region")} placeholder="UAE" />
            )}
            <FormField
              label={editing.id ? "Set a new password" : "Password"}
              type="password"
              value={form.password}
              onChange={set("password")}
              span={2}
              hint={editing.id ? "Leave blank to keep their current password." : "At least 8 characters. They can change it from Account settings."}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
