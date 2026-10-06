import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { accessTitle, api, AREA_GROUPS, AREA_PRESETS, AREAS, getSession } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import Presence from "../components/Presence.jsx";
import Switch from "../components/Switch.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";
import { credentialErrors, emailIsChanging } from "../credentials.js";
import { REGIONS } from "../regions.js";

const EMPTY = {
  name: "",
  email: "",
  emailAgain: "",
  phone: "",
  position: "",
  full_access: false,
  permissions: [],
  developer_ids: [],
  covers: [],
  region: "",
  in_rotation: true,
  password: "",
  passwordAgain: "",
};
const cleanName = (name) => (name ?? "").replace(/\s+/g, " ").trim();
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const names = (list) => (list ?? []).map((d) => cleanName(d.name)).join(", ");

/**
 * Tick developers from a searchable list. Used for "only these developers"
 * (the limit) and for the developers whose leads they take first.
 */
function DeveloperPicker({ label, hint, developers, region, value, onChange }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = developers
    .filter((d) => !q || cleanName(d.name).toLowerCase().includes(q))
    .sort(
      (a, b) =>
        (a.region === region ? 0 : 1) - (b.region === region ? 0 : 1) || cleanName(a.name).localeCompare(cleanName(b.name)),
    );
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="adm-field adm-field--span2">
      <span className="adm-field__label">{label}</span>
      <div className="adm-filters" style={{ margin: "0 0 8px" }}>
        <input
          className="adm-dev-picker__search"
          type="search"
          placeholder="Search developers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="adm-tl__meta">{value.length ? `${value.length} selected` : "None selected"}</span>
        {value.length > 0 && (
          <button type="button" className="adm-chip-btn" onClick={() => onChange([])}>Clear</button>
        )}
      </div>
      <div className="adm-dev-picker" role="group" aria-label={label}>
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
      <span className="adm-field__hint">{hint}</span>
    </div>
  );
}

/** What someone can do, in a line for the table. */
function accessSummary(r) {
  if (r.full_access) return "Everything, including the REIFGO Team";
  const labels = AREAS.filter((a) => r.permissions.includes(a.key)).map((a) => a.label.replace(/ \(.*\)$/, ""));
  return labels.length ? labels.join(" · ") : "Nothing ticked yet";
}

/**
 * The REIFGO Team (Syed, Oct 6): one list of everyone at REIFGO. A few people
 * have full access and manage this page; everyone else gets the areas ticked
 * for them, optionally limited to some developers.
 */
export default function Staff() {
  const [rows, setRows] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [editing, setEditing] = useState(null); // {} new, or a row
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const session = getSession();
  const myId = session?.role === "staff" ? session.broker_id : null;

  const load = () => api.get("/admin/accounts").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
    api.get("/admin/developers").then(setDevelopers).catch(() => {});
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
            phone: row.phone ?? "",
            position: row.position ?? "",
            full_access: row.full_access,
            permissions: row.permissions ?? [],
            developer_ids: (row.developers ?? []).map((d) => d.id),
            covers: (row.covers ?? []).map((d) => d.id),
            region: row.region ?? "",
            in_rotation: row.in_rotation,
          }
        : EMPTY,
    );
  };
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const toggleArea = (key) =>
    set("permissions")(form.permissions.includes(key) ? form.permissions.filter((p) => p !== key) : [...form.permissions, key]);

  const self = !!editing?.id && editing.id === myId;
  const askEmailAgain = !self && emailIsChanging(form.email, editing?.email);
  const worksLeads = !form.full_access && form.permissions.includes("leads_work");
  const seesInvestors = !form.full_access && form.permissions.some((p) => p.startsWith("investor"));
  const usesDevelopers =
    !form.full_access && form.permissions.some((p) => ["developers", "add_developers", "leads_all", "approvals", "activity"].includes(p));

  const save = async () => {
    if (busy) return;
    const isNew = !editing.id;
    const found = {
      ...(form.name.trim() ? {} : { name: "Enter their name" }),
      ...(!form.full_access && form.permissions.length === 0 ? { permissions: "Tick at least one area, or give full access" } : {}),
      ...credentialErrors(form, {
        originalEmail: editing.email ?? "",
        emailRequired: true,
        passwordRequired: isNew,
        checkEmail: !self,
      }),
    };
    setErrors(found);
    if (Object.keys(found).length) return toast.error("Check the fields marked in red");
    setBusy(true);
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      position: form.position.trim(),
      full_access: form.full_access,
      // Full access covers everything; the ticks and limits only matter without it.
      permissions: form.full_access ? [] : form.permissions,
      developer_ids: form.full_access ? [] : form.developer_ids,
      covers: form.full_access || form.permissions.includes("leads_work") ? form.covers : [],
      region: form.full_access ? null : form.region || null,
      in_rotation: form.in_rotation,
      // Full admins change other people's emails, never their own.
      ...(self ? {} : { email: form.email.trim() }),
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (isNew) await api.post("/admin/accounts", body);
      else await api.patch(`/admin/accounts/${editing.id}`, body);
      toast.success(isNew ? `${body.name} added` : "Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const toggleActive = async (row) => {
    try {
      await api.patch(`/admin/accounts/${row.id}`, { is_active: !row.is_active });
      toast.success(row.is_active ? `${row.name} switched off` : `${row.name} switched back on`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.name} from the REIFGO Team? Their history stays in the Activity Log.`)) return;
    try {
      await api.del(`/admin/accounts/${row.id}`);
      toast.success(`${row.name} removed`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      full: list.filter((r) => r.full_access).length,
      online: list.filter((r) => r.last_seen_at && Date.now() - new Date(r.last_seen_at).getTime() < 5 * 60 * 1000).length,
    };
  }, [rows]);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>REIFGO Team</h1>
          <p>
            Everyone at REIFGO who signs in to the CMS. Full access means everything, including this page. Everyone else
            gets the areas you tick.
            {rows && ` ${counts.full} with full access, ${counts.online} online now.`}
          </p>
        </div>
        <button className="adm-btn adm-btn--primary" onClick={() => open({})}>+ Add someone</button>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["name", "email", "position", "region"]}
        searchPlaceholder="Search the REIFGO Team…"
        emptyText={rows === null ? "Loading…" : "No one yet. The owner login still works."}
        onRowClick={open}
        columns={[
          {
            key: "name",
            label: "Team member",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>
                  {r.name}
                  {r.id === myId && <span className="adm-badge adm-badge--muted">You</span>}
                  {!r.is_active && <span className="adm-badge adm-badge--muted">Switched off</span>}
                  {!r.has_password && (
                    <span className="adm-badge adm-badge--pending" title="Set a password for them so they can sign in">
                      No password yet
                    </span>
                  )}
                </strong>
                <span>
                  {r.position ? `${r.position} · ` : ""}
                  {r.email}
                </span>
              </div>
            ),
          },
          {
            key: "access",
            label: "Access",
            width: 260,
            sortValue: (r) => (r.full_access ? "0" : accessTitle(false, r.permissions)),
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>{accessTitle(r.full_access, r.permissions)}</strong>
                {/* A preset's name already says it; spell out custom mixes. */}
                {!r.full_access && !AREA_PRESETS.some((p) => same(p.permissions, r.permissions)) && <span>{accessSummary(r)}</span>}
              </div>
            ),
          },
          {
            key: "limit",
            label: "Developers",
            width: 190,
            sortValue: (r) => (r.full_access || !(r.developers ?? []).length ? 1e6 : r.developers.length),
            render: (r) =>
              r.full_access || !(r.developers ?? []).length ? (
                <span className="adm-muted">All{r.region && !r.full_access ? ` · investors in ${r.region}` : ""}</span>
              ) : (
                <div className="adm-cell-stack">
                  <span title={names(r.developers)}>
                    Only {r.developers.length === 1 ? cleanName(r.developers[0].name) : `${r.developers.length} developers`}
                  </span>
                  {r.region && <span>Investors in {r.region}</span>}
                </div>
              ),
          },
          {
            key: "managed",
            label: "Account manager for",
            width: 180,
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
                <span className="adm-muted">—</span>
              ),
          },
          {
            key: "last_seen_at",
            label: "Last seen",
            width: 150,
            sortValue: (r) => (r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0),
            render: (r) => <Presence at={r.last_seen_at} />,
          },
          { key: "created_at", label: "Added", width: 105, render: (r) => <span style={{ whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</span> },
          {
            key: "actions",
            label: "",
            width: 200,
            sortable: false,
            render: (r) =>
              r.id === myId ? null : (
                <div className="adm-row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => toggleActive(r)}>
                    {r.is_active ? "Switch off" : "Switch on"}
                  </button>
                  <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => remove(r)}>
                    Remove
                  </button>
                </div>
              ),
          },
        ]}
      />

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name}` : "Add someone to the REIFGO Team"}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>
                {busy ? "Saving…" : editing.id ? "Save changes" : "Add"}
              </button>
            </>
          }
        >
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.name} onChange={set("name")} error={errors.name} />
            <FormField label="Job title" value={form.position} onChange={set("position")} placeholder="e.g. Property Consultant" />
            {self ? (
              <label className="adm-field adm-field--span2">
                <span className="adm-field__label">Email</span>
                <input value={form.email} disabled readOnly />
                <span className="adm-field__hint">You can't change your own email. Another full admin can.</span>
              </label>
            ) : (
              <>
                <FormField label="Email" type="email" required value={form.email} onChange={set("email")} span={askEmailAgain ? undefined : 2} error={errors.email} />
                {askEmailAgain && (
                  <FormField label="Email again" type="email" required value={form.emailAgain} onChange={set("emailAgain")} error={errors.emailAgain} />
                )}
              </>
            )}
            <FormField label="Phone" value={form.phone} onChange={set("phone")} span={2} placeholder="+971 …" />

            <div className="adm-field--span2">
              <Switch
                label="Full access"
                description={
                  self && editing.full_access
                    ? "You can't take away your own full access. Another full admin can."
                    : "Everything in the CMS, including this page and everyone's access. Keep this to a few people."
                }
                checked={form.full_access}
                disabled={self && editing.full_access}
                onChange={set("full_access")}
              />
            </div>

            {!form.full_access && (
              <div className={`adm-field adm-field--span2${errors.permissions ? " adm-field--error" : ""}`}>
                <span className="adm-field__label">What they can do <em>*</em></span>
                <div className="adm-perm-presets">
                  {AREA_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`adm-chip-btn${same(form.permissions, p.permissions) ? " is-active" : ""}`}
                      onClick={() => set("permissions")(p.permissions)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="adm-area-groups">
                  {AREA_GROUPS.map((g) => (
                    <fieldset key={g.label} className="adm-area-group">
                      <legend>{g.label}</legend>
                      {g.areas.map((a) => (
                        <label key={a.key} className="adm-area-group__item">
                          <input type="checkbox" checked={form.permissions.includes(a.key)} onChange={() => toggleArea(a.key)} />
                          <span>{a.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
                {errors.permissions ? (
                  <span className="adm-field__error" role="alert">{errors.permissions}</span>
                ) : (
                  <span className="adm-field__hint">The chips are starting points; tick or untick anything after.</span>
                )}
              </div>
            )}

            {usesDevelopers && (
              <DeveloperPicker
                label="Only these developers"
                hint="Leave empty for every developer. When set, they only see these developers' listings, leads and approvals."
                developers={developers}
                region={form.region}
                value={form.developer_ids}
                onChange={set("developer_ids")}
              />
            )}
            {seesInvestors && (
              <FormField
                label="Investors from"
                type="select"
                span={2}
                value={form.region}
                onChange={set("region")}
                options={[{ value: "", label: "Every region" }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
                hint="Optional. They only see investors who live in this region."
              />
            )}

            {(worksLeads || form.full_access) && (
              <>
                <DeveloperPicker
                  label="Takes leads for"
                  hint="Auto rotation sends these developers' leads to them first. Leave empty to take leads for any developer."
                  developers={developers}
                  value={form.covers}
                  onChange={set("covers")}
                />
                <div className="adm-field--span2">
                  <Switch
                    label="In lead rotation"
                    description={
                      worksLeads
                        ? "When auto rotation is on, new leads can go to them."
                        : "Only applies if you also give them leads to work."
                    }
                    checked={form.in_rotation}
                    onChange={set("in_rotation")}
                  />
                </div>
              </>
            )}

            <FormField
              label={editing.id ? (editing.has_password ? "Set a new password" : "Set a password") : "Password"}
              type="password"
              required={!editing.id}
              value={form.password}
              onChange={set("password")}
              span={editing.id && !form.password ? 2 : undefined}
              error={errors.password}
              hint={
                editing.id
                  ? editing.has_password
                    ? "Leave blank to keep their current password."
                    : "They can't sign in until a password is set."
                  : "At least 8 characters. They can change it from Account settings."
              }
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
