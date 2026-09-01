import { useEffect, useState } from "react";
import { api } from "../api.js";
import FormField from "./FormField.jsx";
import { useToast } from "./Toast.jsx";

const str = (v) => (v === "" || v == null ? undefined : v);

/**
 * Add or edit a broker account.
 *
 * The password field is deliberately blank on edit and only sent when filled:
 * an empty box means "leave the password alone", not "clear it". A broker who
 * has never had one set falls back to the shared demo password, so clearing it
 * silently would quietly widen access rather than narrow it.
 */
export default function BrokerDialog({ broker, isAdmin, onClose, onSaved }) {
  const isNew = !broker?.id;
  const [form, setForm] = useState({
    name: broker?.name ?? "",
    email: broker?.email ?? "",
    phone: broker?.phone ?? "",
    position: broker?.position ?? "",
    developer_id: broker?.developer_id ?? "",
    password: "",
  });
  const [developers, setDevelopers] = useState([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // Only an admin picks the desk; a developer's brokers are always their own,
  // and the server enforces that regardless of what is sent.
  useEffect(() => {
    if (!isAdmin) return;
    api.get("/admin/developers").then(setDevelopers).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are both required");
      return;
    }
    if (form.password && form.password.length < 8) {
      toast.error("A password needs at least 8 characters");
      return;
    }
    setBusy(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: str(form.phone),
      position: str(form.position),
      ...(isAdmin && form.developer_id ? { developer_id: form.developer_id } : {}),
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (isNew) {
        await api.post("/admin/brokers", payload);
        toast.success(`${payload.name} added`);
      } else {
        await api.patch(`/admin/brokers/${broker.id}`, payload);
        toast.success("Broker saved");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="adm-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="adm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "Add broker" : `Edit ${broker.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="adm-dialog__head">
          <h2>{isNew ? "Add broker" : "Edit broker"}</h2>
        </header>

        <form className="adm-form" onSubmit={submit}>
          <div className="adm-form-grid adm-dialog__body">
            <FormField label="Name" required value={form.name} onChange={set("name")} />
            <FormField label="Email" required value={form.email} onChange={set("email")} />
            <FormField label="Contact number" value={form.phone} onChange={set("phone")} />
            <FormField
              label="Position"
              value={form.position}
              onChange={set("position")}
              placeholder="Senior Sales Consultant"
            />
            {isAdmin && (
              <FormField
                label="Developer"
                type="select"
                value={form.developer_id}
                onChange={set("developer_id")}
                options={[
                  { value: "", label: "Select a developer…" },
                  ...developers.map((d) => ({
                    value: d.id,
                    label: (d.name || "").replace(/\s+/g, " "),
                  })),
                ]}
                span={2}
              />
            )}
            <FormField
              label={isNew ? "Password" : "New password"}
              type="password"
              value={form.password}
              onChange={set("password")}
              span={2}
              hint={
                isNew
                  ? "At least 8 characters. Leave blank and the account uses the shared demo password until one is set."
                  : "Leave blank to keep the current password."
              }
            />
          </div>

          <footer className="adm-dialog__actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="adm-btn adm-btn--primary" disabled={busy}>
              {busy ? "Saving…" : isNew ? "Add broker" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
