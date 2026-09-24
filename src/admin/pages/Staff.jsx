import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getSession } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import Presence from "../components/Presence.jsx";
import Switch from "../components/Switch.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";
import { credentialErrors, emailIsChanging } from "../credentials.js";
import { REGIONS } from "../regions.js";

const ROLE_LABEL = { reifgo_admin: "REIFGO admin", regional_admin: "Regional admin" };
const EMPTY = {
  name: "",
  email: "",
  emailAgain: "",
  role: "reifgo_admin",
  region: "",
  developer_ids: [],
  can_create_developers: false,
  password: "",
  passwordAgain: "",
};
const cleanName = (name) => (name ?? "").replace(/\s+/g, " ").trim();

/**
 * The developers a regional admin works on (Syed, Sept 24): pick the region,
 * then tick developers. Those in the region come first; the rest stay
 * reachable because most developers have no region set yet.
 */
function DeveloperPicker({ developers, region, value, onChange, error }) {
  const [query, setQuery] = useState("");
  const [onlyRegion, setOnlyRegion] = useState(true);
  const inRegion = developers.filter((d) => d.region === region);
  const useFilter = onlyRegion && !!region && inRegion.length > 0;
  const q = query.trim().toLowerCase();
  const shown = (useFilter ? inRegion : developers)
    .filter((d) => !q || cleanName(d.name).toLowerCase().includes(q))
    .sort((a, b) => (a.region === region ? 0 : 1) - (b.region === region ? 0 : 1) || cleanName(a.name).localeCompare(cleanName(b.name)));
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className={`adm-field adm-field--span2${error ? " adm-field--error" : ""}`}>
      <span className="adm-field__label">Developers they work on <em>*</em></span>
      <div className="adm-filters" style={{ margin: "0 0 8px" }}>
        <input
          className="adm-dev-picker__search"
          type="search"
          placeholder="Search developers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {region && inRegion.length > 0 && (
          <button type="button" className="adm-chip-btn" onClick={() => setOnlyRegion((v) => !v)}>
            {useFilter ? `Showing ${region} only · show all` : `Show ${region} only`}
          </button>
        )}
        <span className="adm-tl__meta">{value.length} selected</span>
      </div>
      <div className="adm-dev-picker" role="group" aria-label="Developers">
        {shown.length === 0 ? (
          <p className="adm-icon-empty">No developers match.</p>
        ) : (
          shown.map((d) => (
            <label key={d.id} className={`adm-dev-picker__item${value.includes(d.id) ? " is-on" : ""}`}>
              <input type="checkbox" checked={value.includes(d.id)} onChange={() => toggle(d.id)} />
              <span>{cleanName(d.name)}</span>
              <span className="adm-dev-picker__region">{d.region ?? "No region"}</span>
            </label>
          ))
        )}
      </div>
      {error ? (
        <span className="adm-field__error" role="alert">{error}</span>
      ) : (
        <span className="adm-field__hint">
          They only see these developers' listings, leads, teams and approvals.
          {region && inRegion.length === 0 && ` No developer has ${region} as its region yet; set it on the developer's profile.`}
        </span>
      )}
    </div>
  );
}

// REIFGO's own staff accounts (AdminAccount). Only a REIFGO admin can add or
// change them; a regional admin sees just their own row.
export default function Staff() {
  const [rows, setRows] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [editing, setEditing] = useState(null); // {} new, or a row
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
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
    if (canManage) api.get("/admin/developers").then(setDevelopers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (row) => {
    setEditing(row);
    setErrors({});
    setForm(
      row.id
        ? {
            ...EMPTY,
            name: row.name,
            email: row.email,
            role: row.role,
            region: row.region ?? "",
            developer_ids: (row.developers ?? []).map((d) => d.id),
            can_create_developers: !!row.can_create_developers,
          }
        : EMPTY,
    );
  };
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const ownEmail = !!editing?.id && editing.email === mine;
  const askEmailAgain = !ownEmail && emailIsChanging(form.email, editing?.email);
  const regional = form.role === "regional_admin";

  const save = async () => {
    if (busy) return;
    const isNew = !editing.id;
    const found = {
      ...(form.name.trim() ? {} : { name: "Enter their name" }),
      ...(regional && !form.region ? { region: "Choose their region" } : {}),
      ...(regional && form.developer_ids.length === 0 ? { developer_ids: "Pick at least one developer" } : {}),
      ...credentialErrors(form, {
        originalEmail: editing.email ?? "",
        emailRequired: true,
        passwordRequired: isNew,
        checkEmail: !ownEmail,
      }),
    };
    setErrors(found);
    if (Object.keys(found).length) return toast.error("Check the fields marked in red");
    setBusy(true);
    const body = {
      name: form.name.trim(),
      role: form.role,
      ...(regional
        ? { region: form.region, developer_ids: form.developer_ids, can_create_developers: form.can_create_developers }
        : {}),
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

  const online = useMemo(
    () => (rows ?? []).filter((r) => r.last_seen_at && Date.now() - new Date(r.last_seen_at).getTime() < 5 * 60 * 1000).length,
    [rows],
  );

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>REIFGO Team</h1>
          <p>
            REIFGO's own staff. They approve developer requests, look after the developers they're account manager for,
            and run events. {rows && `${online} online now.`}
          </p>
        </div>
        {canManage && (
          <button className="adm-btn adm-btn--primary" onClick={() => open({})}>+ Add account</button>
        )}
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "email", "region"]}
        searchPlaceholder="Search the REIFGO team…"
        emptyText={rows === null ? "Loading…" : "No REIFGO accounts yet. The shared owner login still works."}
        columns={[
          {
            key: "name",
            label: "Team member",
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
          { key: "role", label: "Role", width: 140, sortValue: (r) => ROLE_LABEL[r.role], render: (r) => ROLE_LABEL[r.role] ?? r.role },
          {
            key: "scope",
            label: "Works on",
            width: 190,
            sortValue: (r) => (r.role === "regional_admin" ? (r.developers ?? []).length : 1e6),
            render: (r) =>
              r.role === "regional_admin" ? (
                <div className="adm-cell-stack">
                  <strong>{r.region}</strong>
                  <span title={(r.developers ?? []).map((d) => cleanName(d.name)).join(", ")}>
                    {(r.developers ?? []).length} developer{(r.developers ?? []).length === 1 ? "" : "s"}
                    {r.can_create_developers ? " · can add" : ""}
                  </span>
                </div>
              ) : (
                "All developers"
              ),
          },
          {
            key: "managed",
            label: "Account manager for",
            width: 190,
            sortValue: (r) => (r.managed_developers ?? []).length,
            render: (r) =>
              (r.managed_developers ?? []).length ? (
                <span className="adm-link-list">
                  {r.managed_developers.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 && ", "}
                      <Link to={`/admin/developers/${d.id}`} onClick={(e) => e.stopPropagation()}>{cleanName(d.name)}</Link>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="adm-muted">None yet</span>
              ),
          },
          {
            key: "last_seen_at",
            label: "Last seen",
            width: 170,
            sortValue: (r) => (r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0),
            render: (r) => <Presence at={r.last_seen_at} />,
          },
          { key: "created_at", label: "Created", width: 110, render: (r) => fmtDate(r.created_at) },
          ...(canManage
            ? [
                {
                  key: "actions",
                  label: "",
                  width: 190,
                  sortable: false,
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
            <FormField label="Name" required value={form.name} onChange={set("name")} span={2} error={errors.name} />
            {ownEmail ? (
              <label className="adm-field adm-field--span2">
                <span className="adm-field__label">Email</span>
                <input value={form.email} disabled readOnly />
                <span className="adm-field__hint">You can't change your own email. Another REIFGO admin can.</span>
              </label>
            ) : (
              <>
                <FormField label="Email" type="email" required value={form.email} onChange={set("email")} span={askEmailAgain ? undefined : 2} error={errors.email} />
                {askEmailAgain && (
                  <FormField label="Email again" type="email" required value={form.emailAgain} onChange={set("emailAgain")} error={errors.emailAgain} />
                )}
              </>
            )}
            <FormField
              label="Role"
              type="select"
              value={form.role}
              onChange={set("role")}
              span={regional ? undefined : 2}
              options={[
                { value: "reifgo_admin", label: "REIFGO admin (everything)" },
                { value: "regional_admin", label: "Regional admin (chosen developers)" },
              ]}
            />
            {regional && (
              <FormField
                label="Region"
                type="select"
                required
                value={form.region}
                onChange={set("region")}
                error={errors.region}
                options={[{ value: "", label: "Choose a region…" }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
              />
            )}
            {regional && (
              <DeveloperPicker
                developers={developers}
                region={form.region}
                value={form.developer_ids}
                onChange={set("developer_ids")}
                error={errors.developer_ids}
              />
            )}
            {regional && (
              <div className="adm-field--span2">
                <Switch
                  label="Can add developers"
                  description="New developers they add wait for a main REIFGO admin to approve them before they show in the app."
                  checked={form.can_create_developers}
                  onChange={set("can_create_developers")}
                />
              </div>
            )}
            <FormField
              label={editing.id ? "Set a new password" : "Password"}
              type="password"
              required={!editing.id}
              value={form.password}
              onChange={set("password")}
              span={editing.id && !form.password ? 2 : undefined}
              error={errors.password}
              hint={editing.id ? "Leave blank to keep their current password." : "At least 8 characters. They can change it from Account settings."}
            />
            {(!editing.id || form.password) && (
              <FormField label="Password again" type="password" required value={form.passwordAgain} onChange={set("passwordAgain")} error={errors.passwordAgain} />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
