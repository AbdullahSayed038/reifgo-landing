import { useEffect, useState } from "react";
import { api, getSession, isManagerAccess, isReifgoAdmin, isReifgoTier, permissionTitle, PERMISSION_PRESETS, PERMISSIONS } from "../api.js";
import { str } from "../contentUtils.js";
import { credentialErrors, emailIsChanging } from "../credentials.js";
import FormField from "./FormField.jsx";
import { useToast } from "./Toast.jsx";

/**
 * Add or edit someone on REIFGO's sales team (Sales Manager, Sales Agent, or
 * custom access), and which developers they cover.
 *
 * Access is tick-box permissions with the two job titles as presets. When a
 * Sales Manager gives someone management access it waits for a REIFGO admin.
 * The email is fixed once the account exists, and only REIFGO sets someone
 * else's password — everyone can change their own from Account settings.
 */
export default function BrokerDialog({ broker, onClose, onSaved }) {
  const isNew = !broker?.id;
  const session = getSession();
  const reifgo = isReifgoTier(session);
  const [form, setForm] = useState({
    name: broker?.name ?? "",
    email: broker?.email ?? "",
    phone: broker?.phone ?? "",
    position: broker?.position ?? "",
    covers: (broker?.covers ?? []).map((d) => d.id),
    permissions: broker?.permissions ?? [],
    emailAgain: "",
    password: "",
    passwordAgain: "",
  });
  const [errors, setErrors] = useState({});
  const [developers, setDevelopers] = useState([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // A team account can only hand out what it has itself.
  const grantable = (key) =>
    session?.role !== "broker" || (session.permissions ?? []).includes(key);

  useEffect(() => {
    api.get("/admin/brokers/developer-options").then(setDevelopers).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // A red mark clears as soon as that field is edited.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };
  const emailEditable = isNew || isReifgoAdmin(session);
  // Syed, Sept 24: once someone is a Sales Manager, only a REIFGO admin changes
  // their access. When a Sales Manager gives a live account more access it
  // waits for a REIFGO admin; a new Sales Agent needs no approval at all.
  const live = !isNew && (broker.approval_status ?? "approved") === "approved";
  const accessLocked = !reifgo && live && isManagerAccess(broker.permissions ?? []);
  const adding = form.permissions.some((p) => !(broker?.permissions ?? []).includes(p));
  const needsApproval = !reifgo && ((isNew && form.permissions.length > 0) || (live && adding));
  const askEmailAgain = emailEditable && emailIsChanging(form.email, broker?.email);
  const togglePermission = (key) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  const applyPreset = (preset) => setForm((f) => ({ ...f, permissions: [...preset.permissions] }));
  const samePerms = (list) =>
    list.length === form.permissions.length && list.every((p) => form.permissions.includes(p));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const found = {
      ...(form.name.trim() ? {} : { name: "Enter their name" }),
      ...credentialErrors(form, {
        originalEmail: broker?.email ?? "",
        emailRequired: true,
        passwordRequired: isNew,
        checkEmail: emailEditable,
      }),
    };
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Check the fields marked in red");
      return;
    }
    setBusy(true);

    const payload = {
      name: form.name.trim(),
      ...(isNew || isReifgoAdmin(session) ? { email: form.email.trim() } : {}),
      phone: str(form.phone),
      position: str(form.position),
      permissions: form.permissions,
      developer_ids: form.covers,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (isNew) {
        const created = await api.post("/admin/brokers", payload);
        toast.success(
          created.approval_status === "pending"
            ? `${payload.name} added. They can sign in once a REIFGO admin approves the account.`
            : `${payload.name} added. They can sign in now.`,
        );
      } else {
        const saved = await api.patch(`/admin/brokers/${broker.id}`, accessLocked ? { ...payload, permissions: undefined } : payload);
        toast.success(
          saved?.permissions_requested_at && !broker.permissions_requested_at
            ? "Saved. The new access is waiting for a REIFGO admin to approve it."
            : "Team member saved",
        );
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
        aria-label={isNew ? "Add to the sales team" : `Edit ${broker.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="adm-dialog__head">
          <h2>{isNew ? "Add to the sales team" : `Edit ${broker.name}`}</h2>
        </header>

        <form className="adm-form" onSubmit={submit} noValidate>
          <div className="adm-form-grid adm-dialog__body">
            {broker?.approval_status === "rejected" && (
              <p className="adm-note adm-note--danger adm-field--span2" style={{ margin: 0 }}>
                A REIFGO admin declined this account{broker.rejection_reason ? `: ${broker.rejection_reason}` : "."} Saving your changes sends it back for approval.
              </p>
            )}
            <FormField label="Name" required value={form.name} onChange={set("name")} error={errors.name} />
            {emailEditable ? (
              <>
                <FormField
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  error={errors.email}
                  hint={isNew ? "Their sign-in address. Only REIFGO can change it later." : "Their sign-in address. Only REIFGO admins can change it."}
                />
                {askEmailAgain && (
                  <FormField label="Email again" type="email" required value={form.emailAgain} onChange={set("emailAgain")} error={errors.emailAgain} />
                )}
              </>
            ) : (
              <label className="adm-field">
                <span className="adm-field__label">Email</span>
                <input value={form.email} disabled readOnly />
                <span className="adm-field__hint">Only REIFGO can change an email address.</span>
              </label>
            )}
            <FormField label="Contact number" value={form.phone} onChange={set("phone")} />
            <FormField
              label="Position"
              value={form.position}
              onChange={set("position")}
              placeholder="Senior Sales Consultant"
            />
            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Covers developers</span>
              <div className="adm-country-chips">
                {form.covers.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="adm-chip-btn is-active"
                    aria-label={`Stop covering ${developers.find((d) => d.id === id)?.name ?? "this developer"}`}
                    onClick={() => set("covers")(form.covers.filter((x) => x !== id))}
                  >
                    {developers.find((d) => d.id === id)?.name ?? "…"} <span aria-hidden="true">✕</span>
                  </button>
                ))}
                <select
                  className="adm-inline-select"
                  value=""
                  aria-label="Add a developer they cover"
                  onChange={(e) => e.target.value && set("covers")([...form.covers, e.target.value])}
                >
                  <option value="">{form.covers.length ? "+ Add a developer" : "Any developer (add one to focus)"}</option>
                  {developers
                    .filter((d) => !form.covers.includes(d.id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>
              <span className="adm-field__hint">
                With auto rotation on, leads for these developers go to the agents covering them first. Anyone can still be assigned any lead by hand.
              </span>
            </div>

            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Access</span>
              <div className="adm-perm-presets">
                {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                  <button
                    type="button"
                    key={key}
                    className={`adm-chip-btn${samePerms(preset.permissions) ? " is-active" : ""}`}
                    disabled={accessLocked || !preset.permissions.every(grantable)}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="adm-perm-list">
                <label className="adm-field--checkbox" style={{ opacity: 0.7 }}>
                  <input type="checkbox" checked disabled />
                  <span>Work the leads assigned to them (everyone)</span>
                </label>
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="adm-field--checkbox">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p.key)}
                      disabled={accessLocked || !grantable(p.key) || (!isNew && broker.id === session?.broker_id)}
                      onChange={() => togglePermission(p.key)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
              {accessLocked ? (
                <span className="adm-field__hint">A Sales Manager's access can only be changed by a REIFGO admin.</span>
              ) : broker?.permissions_requested_at ? (
                <span className="adm-field__hint">
                  Waiting for a REIFGO admin to approve {permissionTitle(broker.pending_permissions)} access. They keep their current access until then.
                </span>
              ) : needsApproval ? (
                <span className="adm-field__hint adm-field__hint--warn">
                  {isNew
                    ? "Management access needs a REIFGO admin's approval. They can sign in once it's approved."
                    : "Giving more access needs a REIFGO admin's approval. They keep their current access until then."}
                </span>
              ) : !reifgo && isNew ? (
                <span className="adm-field__hint">A Sales Agent can sign in straight away.</span>
              ) : null}
            </div>

            {(isNew || reifgo) && (
              <>
                <FormField
                  label={isNew ? "Password" : "Set a new password"}
                  type="password"
                  required={isNew}
                  value={form.password}
                  onChange={set("password")}
                  error={errors.password}
                  hint={
                    isNew
                      ? "At least 8 characters. They can change it later from Account settings."
                      : "REIFGO only. Leave blank to keep their current password."
                  }
                />
                {(isNew || form.password) && (
                  <FormField label="Password again" type="password" required value={form.passwordAgain} onChange={set("passwordAgain")} error={errors.passwordAgain} />
                )}
              </>
            )}
          </div>

          <footer className="adm-dialog__actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="adm-btn adm-btn--primary" disabled={busy}>
              {busy ? "Saving…" : isNew ? "Add to the team" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
