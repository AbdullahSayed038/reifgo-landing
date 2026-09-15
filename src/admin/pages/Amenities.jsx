import { useEffect, useState } from "react";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import FormField from "../components/FormField.jsx";
import IconPicker, { IconPreview } from "../components/IconPicker.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

const GROUPS = ["Building Amenities", "Unit Facilities"];
const EMPTY = { label: "", icon: "", group_name: "Building Amenities" };

// The amenities listings pick from, with the icon the app shows for each.
// Requests for missing ones arrive in Approvals.
export default function Amenities() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => api.get("/admin/amenities").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (row) => {
    setEditing(row);
    setForm(row.id ? { label: row.label, icon: row.icon, group_name: row.group_name } : EMPTY);
  };
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (busy) return;
    if (!form.label.trim()) return toast.error("Give the amenity a name");
    if (!form.icon) return toast.error("Pick an icon");
    setBusy(true);
    try {
      if (editing.id) await api.patch(`/admin/amenities/${editing.id}`, form);
      else await api.post("/admin/amenities", form);
      toast.success(editing.id ? "Amenity saved. Listings using it are updated." : "Amenity added");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.label} from the list? Listings that already have it keep it.`)) return;
    try {
      await api.del(`/admin/amenities/${row.id}`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Amenities</h1>
          <p>The amenities developers pick from on a listing, and the icon the app shows for each.</p>
        </div>
        <button className="adm-btn adm-btn--primary" onClick={() => open({})}>+ Add amenity</button>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["label", "group_name", "icon"]}
        searchPlaceholder="Search amenities…"
        emptyText={rows === null ? "Loading…" : "No amenities yet."}
        onRowClick={open}
        groupBy={(r) => r.group_name}
        columns={[
          {
            key: "label",
            label: "Amenity",
            render: (r) => (
              <span className="adm-amenity-cell">
                <IconPreview name={r.icon} />
                <strong>{r.label}</strong>
              </span>
            ),
          },
          { key: "icon", label: "Icon name", width: 240, render: (r) => <code>{r.icon}</code> },
          {
            key: "actions",
            label: "",
            width: 60,
            render: (r) => (
              <button
                className="adm-icon-btn adm-icon-btn--danger"
                aria-label={`Remove ${r.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(r);
                }}
              >
                ✕
              </button>
            ),
          },
        ]}
      />

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.label}` : "Add amenity"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>
                {busy ? "Saving…" : editing.id ? "Save" : "Add amenity"}
              </button>
            </>
          }
        >
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.label} onChange={set("label")} />
            <FormField
              label="Group"
              type="select"
              value={form.group_name}
              onChange={set("group_name")}
              options={GROUPS.map((g) => ({ value: g, label: g }))}
            />
            <IconPicker value={form.icon} onChange={set("icon")} />
          </div>
        </Modal>
      )}
    </>
  );
}
