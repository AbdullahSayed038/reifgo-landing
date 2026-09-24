import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DeveloperListings, DeveloperTeam } from "../components/DeveloperTabs.jsx";
import { api, getSession, isReifgoAdmin, isReifgoTier, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
import { IconSelect } from "../components/IconPicker.jsx";
import Switch from "../components/Switch.jsx";
import Presence from "../components/Presence.jsx";
import { REGIONS } from "../regions.js";
import { COUNTRIES, countryName } from "../countries.js";
import { credentialErrors, emailIsChanging } from "../credentials.js";
import { useToast } from "../components/Toast.jsx";

const EMPTY = {
  name: "",
  tagline: "",
  years_in_market: "",
  total_projects: "",
  international_hubs: "",
  hero_image_url: "",
  logo_url: "",
  email: "",
  emailAgain: "",
  password: "",
  passwordAgain: "",
  is_verified: false,
  is_approved: false,
  region: "",
  countries: [],
  account_manager_id: "",
  values: [],
};

const num = (v) => (v === "" || v == null ? undefined : Number(v));
const str = (v) => (v === "" || v == null ? undefined : v);

// selfMode = a developer account editing its own company profile at
// /admin/company: the id comes from the session, approval flags are
// admin-only, and saving stays on the page.
export default function DeveloperForm({ selfMode = false }) {
  const params = useParams();
  const session = getSession();
  const id = selfMode ? session?.developer_id : params.id;
  const isNew = !id;
  const canModerate = isReifgoTier(session);
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState(null);
  // REIFGO sees a developer's listings and sales team as tabs on its page
  // (Syed, Sept 22), instead of a separate Properties page.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "profile";
  const showTabs = !isNew && !selfMode;
  const [devRow, setDevRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  // REIFGO team members who can be the account manager (main admins pick).
  const [staff, setStaff] = useState([]);
  const mainAdmin = isReifgoAdmin(session);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!mainAdmin || selfMode) return;
    api.get("/admin/accounts").then((rows) => setStaff(rows.filter((r) => r.is_active))).catch(() => {});
  }, [mainAdmin, selfMode]);

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/developers/${id}`)
      .then((d) => {
        setDevRow(d);
        setMeta({ email: d.email, pending_logo_url: d.pending_logo_url, logo_url: d.logo_url, created_at: d.created_at });
        return d;
      })
      .then((d) =>
        setForm({
          name: d.name ?? "",
          logo_url: d.logo_url ?? "",
          email: d.email ?? "",
          emailAgain: "",
          password: "",
          passwordAgain: "",
          tagline: d.tagline ?? "",
          years_in_market: d.years_in_market ?? "",
          total_projects: d.total_projects ?? "",
          international_hubs: d.international_hubs ?? "",
          hero_image_url: d.hero_image_url ?? "",
          is_verified: d.is_verified,
          is_approved: d.is_approved,
          region: d.region ?? "",
          countries: d.countries ?? [],
          account_manager_id: d.account_manager?.id ?? "",
          values: (d.values ?? []).map((v) => ({
            icon: v.icon ?? "",
            title: v.title,
            description: v.description ?? "",
          })),
        }),
      )
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const heroFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const logoFileRef = useRef(null);
  const onLogoPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, logo_url: url }));
    } catch (err) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const onHeroPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, hero_image_url: url }));
    } catch (err) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const setValue = (i, key, value) =>
    setForm((f) => ({
      ...f,
      values: f.values.map((v, j) => (j === i ? { ...v, [key]: value } : v)),
    }));
  const addValue = () =>
    setForm((f) => ({ ...f, values: [...f.values, { icon: "", title: "", description: "" }] }));
  const removeValue = (i) =>
    setForm((f) => ({ ...f, values: f.values.filter((_, j) => j !== i) }));

  // REIFGO sets the sign-in email once; after that only a main admin changes it.
  const emailEditable = canModerate && (isNew || !meta?.email || isReifgoAdmin(session));
  const askEmailAgain = emailEditable && emailIsChanging(form.email, meta?.email);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const found = {
      ...(form.name.trim() ? {} : { name: "Enter the developer's name" }),
      ...(canModerate
        ? credentialErrors(form, { originalEmail: meta?.email ?? "", checkEmail: emailEditable })
        : {}),
    };
    // A password is no use without an email to sign in with.
    if (canModerate && form.password && !form.email.trim() && !found.email) {
      found.email = "Add a sign-in email so they can use this password";
    }
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Check the fields marked in red");
      return;
    }
    setBusy(true);

    const payload = {
      name: form.name,
      tagline: str(form.tagline),
      years_in_market: num(form.years_in_market),
      total_projects: num(form.total_projects),
      international_hubs: str(form.international_hubs),
      hero_image_url: str(form.hero_image_url),
      logo_url: str(form.logo_url),
      // The sign-in email is set once, by REIFGO; the password only by REIFGO.
      ...(emailEditable && form.email.trim() ? { email: form.email.trim() } : {}),
      ...(canModerate && form.password ? { password: form.password } : {}),
      ...(canModerate && {
        is_verified: form.is_verified,
        is_approved: form.is_approved,
        countries: form.countries,
      }),
      // Region and account manager are the main admins' call.
      ...(mainAdmin && !selfMode && {
        region: form.region || null,
        account_manager_id: form.account_manager_id || null,
      }),
      values: form.values
        .filter((v) => v.title.trim())
        .map((v, i) => ({
          icon: str(v.icon),
          title: v.title.trim(),
          description: str(v.description),
          display_order: i,
        })),
    };

    try {
      if (isNew) {
        const created = await api.post("/admin/developers", payload);
        toast.success(
          created?.approval_status === "pending"
            ? "Developer added. A REIFGO admin needs to approve it before it shows in the app."
            : "Developer created",
        );
      } else {
        const saved = await api.patch(`/admin/developers/${id}`, payload);
        setMeta((m) => ({ ...m, email: saved.email, pending_logo_url: saved.pending_logo_url, logo_url: saved.logo_url }));
        toast.success(
          !canModerate && saved.pending_logo_url && saved.pending_logo_url !== meta?.pending_logo_url
            ? "Profile saved. The new logo shows once REIFGO approves it."
            : selfMode
              ? "Company profile saved"
              : "Developer saved",
        );
        if (!canModerate) setForm((f) => ({ ...f, logo_url: saved.logo_url ?? "" }));
        setForm((f) => ({ ...f, emailAgain: "", password: "", passwordAgain: "" }));
      }
      if (selfMode) {
        setBusy(false);
      } else {
        navigate("/admin/developers");
      }
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          {!selfMode && (
            <nav className="adm-crumbs">
              <Link to="/admin/developers">Developers</Link>
              <span>/</span>
              <span>{isNew ? "New" : form.name || "Edit"}</span>
            </nav>
          )}
          <h1>
            {selfMode
              ? "Company profile"
              : isNew
                ? "New developer"
                : form.name || "Edit developer"}
          </h1>
          {selfMode && <p>How {form.name || "your company"} appears in the REIFGO app.</p>}
        </div>
      </header>

      {!selfMode && devRow?.approval_status === "pending" && (
        <p className="adm-note adm-note--warn">
          Added by {devRow.created_by_admin?.name ?? "a regional admin"}. It stays out of the app, and its sign-in doesn't work,
          until a main REIFGO admin approves it in Approvals.
        </p>
      )}
      {!selfMode && devRow?.approval_status === "rejected" && (
        <p className="adm-note adm-note--danger">
          A REIFGO admin declined this developer{devRow.rejection_reason ? `: ${devRow.rejection_reason}` : "."}
        </p>
      )}

      {showTabs && (
        <div className="adm-tabs">
          {[
            ["profile", "Profile"],
            ["properties", `Listings${devRow?._count?.properties != null ? ` (${devRow._count.properties})` : ""}`],
            ["team", `Sales team${devRow?._count?.brokers != null ? ` (${devRow._count.brokers})` : ""}`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`adm-tab${tab === key ? " is-active" : ""}`}
              onClick={() => setSearchParams(key === "profile" ? {} : { tab: key }, { replace: true })}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showTabs && tab === "properties" && <DeveloperListings developerId={id} />}
      {showTabs && tab === "team" && devRow && (
        <DeveloperTeam developer={devRow} onDeveloperChange={(d) => setDevRow(d)} />
      )}

      {(!showTabs || tab === "profile") && (
      <form className="adm-form" onSubmit={submit} noValidate>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.name} onChange={set("name")} error={errors.name} />
            <FormField label="Tagline" value={form.tagline} onChange={set("tagline")} placeholder="Building tomorrow's skylines" />
            <FormField label="Years in market" type="number" value={form.years_in_market} onChange={set("years_in_market")} />
            <FormField label="Total projects" type="number" value={form.total_projects} onChange={set("total_projects")} />
            <FormField label="International hubs" value={form.international_hubs} onChange={set("international_hubs")} placeholder="Dubai · London · New York" />
            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Hero image</span>
              <div className="adm-upload-row">
                {form.hero_image_url ? (
                  <img className="adm-thumb adm-thumb--lg" src={form.hero_image_url} alt="" />
                ) : (
                  <span className="adm-thumb adm-thumb--lg adm-thumb--empty">No image</span>
                )}
                <input
                  type={form.hero_image_url.startsWith("data:") ? "text" : "url"}
                  placeholder="https://… or upload a file"
                  value={
                    form.hero_image_url.startsWith("data:")
                      ? "Uploaded image"
                      : form.hero_image_url
                  }
                  disabled={form.hero_image_url.startsWith("data:")}
                  onChange={(e) => set("hero_image_url")(e.target.value)}
                />
                <input ref={heroFileRef} type="file" accept="image/*" hidden onChange={onHeroPicked} />
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={uploading}
                  onClick={() => heroFileRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "↑ Upload"}
                </button>
                {form.hero_image_url && (
                  <button
                    type="button"
                    className="adm-icon-btn adm-icon-btn--danger"
                    aria-label="Remove hero image"
                    onClick={() => set("hero_image_url")("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Logo</span>
              <div className="adm-upload-row">
                {form.logo_url ? (
                  <img className="adm-thumb adm-thumb--lg" src={form.logo_url} alt="" style={{ objectFit: "contain", background: "#fff" }} />
                ) : (
                  <span className="adm-thumb adm-thumb--lg adm-thumb--empty">No logo</span>
                )}
                <input ref={logoFileRef} type="file" accept="image/*" hidden onChange={onLogoPicked} />
                <button type="button" className="adm-btn adm-btn--ghost" disabled={uploading} onClick={() => logoFileRef.current?.click()}>
                  {uploading ? "Uploading…" : canModerate ? "↑ Upload logo" : "↑ Request a new logo"}
                </button>
              </div>
              {!canModerate && meta?.pending_logo_url && (
                <span className="adm-field__hint">
                  A new logo is waiting for REIFGO to approve it. The app keeps showing the current one until then.
                </span>
              )}
              {!canModerate && !meta?.pending_logo_url && (
                <span className="adm-field__hint">Logo changes are checked by REIFGO before they go live.</span>
              )}
            </div>
            {canModerate && (
              emailEditable ? (
                <>
                  <FormField
                    label="Sign-in email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    error={errors.email}
                    hint={
                      isNew || !meta?.email
                        ? "Used to sign in and for Forgot password. Only a REIFGO admin can change it later."
                        : "Used to sign in and for Forgot password. The developer can't change it themselves."
                    }
                  />
                  {askEmailAgain && (
                    <FormField label="Sign-in email again" type="email" value={form.emailAgain} onChange={set("emailAgain")} error={errors.emailAgain} />
                  )}
                </>
              ) : (
                <label className="adm-field">
                  <span className="adm-field__label">Sign-in email</span>
                  <input value={meta?.email ?? ""} disabled readOnly />
                  <span className="adm-field__hint">Used to sign in and for Forgot password. Only a REIFGO admin can change it.</span>
                </label>
              )
            )}
            {canModerate && (
              <>
                <FormField
                  label={isNew ? "Password" : "Set a new password"}
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  error={errors.password}
                  hint={isNew ? "At least 8 characters." : "Leave blank to keep the current password."}
                />
                {form.password && (
                  <FormField label="Password again" type="password" value={form.passwordAgain} onChange={set("passwordAgain")} error={errors.passwordAgain} />
                )}
              </>
            )}
            {canModerate && (
              <div className="adm-switch-group adm-field--span2">
                <Switch
                  label="Show in the app"
                  description={
                    (isNew && !mainAdmin) || (devRow?.approval_status === "pending" && !mainAdmin)
                      ? "Turns on once a main REIFGO admin approves this developer."
                      : "Lists this developer on the app's Developers screen. Turn it off while the profile is being set up."
                  }
                  checked={form.is_approved}
                  disabled={(isNew && !mainAdmin) || (devRow?.approval_status === "pending" && !mainAdmin)}
                  onChange={set("is_approved")}
                />
                <Switch
                  label="Verified developer"
                  description="Adds the verified tick next to the developer's name on its listings."
                  checked={form.is_verified}
                  onChange={set("is_verified")}
                />
              </div>
            )}
          </div>
        </section>

        {selfMode && form.countries.length > 0 && (
          <section className="adm-panel">
            <header className="adm-panel__head">
              <div>
                <h2>Countries you build in</h2>
                <p className="adm-panel__note">Your listings can be in these countries, priced in each country's currency. Ask REIFGO to add another.</p>
              </div>
            </header>
            <div className="adm-country-chips adm-panel__pad">
              {form.countries.map((c) => <span key={c} className="adm-chip-btn">{countryName(c)}</span>)}
            </div>
          </section>
        )}

        {canModerate && !selfMode && (
          <section className="adm-panel">
            <header className="adm-panel__head">
              <div>
                <h2>REIFGO</h2>
                <p className="adm-panel__note">Who at REIFGO looks after this developer. Only main REIFGO admins change these.</p>
              </div>
            </header>
            <div className="adm-form-grid">
              {mainAdmin ? (
                <>
                  <FormField
                    label="Account manager"
                    type="select"
                    value={form.account_manager_id}
                    onChange={set("account_manager_id")}
                    hint={staff.length ? "The REIFGO team member responsible for this developer." : "Add people on the REIFGO Team page first."}
                    options={[
                      { value: "", label: "Not set" },
                      ...staff.map((a) => ({
                        value: a.id,
                        label: `${a.name}${a.role === "regional_admin" ? ` · Regional admin, ${a.region}` : ""}`,
                      })),
                    ]}
                  />
                  <FormField
                    label="Region"
                    type="select"
                    value={form.region}
                    onChange={set("region")}
                    hint="Regional admins for this region see it first when they're given developers."
                    options={[{ value: "", label: "Not set" }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
                  />
                </>
              ) : (
                <>
                  <label className="adm-field">
                    <span className="adm-field__label">Account manager</span>
                    <input value={devRow?.account_manager?.name ?? (isNew ? "You" : "Not set")} disabled readOnly />
                  </label>
                  <label className="adm-field">
                    <span className="adm-field__label">Region</span>
                    <input value={form.region || "Not set"} disabled readOnly />
                  </label>
                </>
              )}
              <div className="adm-field adm-field--span2">
                <span className="adm-field__label">Countries they build in</span>
                <CountryPicker value={form.countries} onChange={set("countries")} />
                <span className="adm-field__hint">
                  Their listings can only be in these countries, and each listing is priced in its country's currency. Leave empty to allow any country.
                </span>
              </div>
              {!isNew && (
                <label className="adm-field">
                  <span className="adm-field__label">Company login</span>
                  <span className="adm-field__static">
                    <Presence at={devRow?.last_seen_at} />
                  </span>
                </label>
              )}
            </div>
          </section>
        )}

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Company values</h2>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={addValue}>
              + Add value
            </button>
          </header>
          {form.values.length === 0 && (
            <p className="adm-panel__empty">No values yet. These show on the developer's profile page.</p>
          )}
          <ul className="adm-repeater adm-repeater--stacked">
            {form.values.map((v, i) => (
              <li key={i}>
                <span className="adm-repeater__index">{i + 1}</span>
                <div className="adm-repeater__fields">
                  <input placeholder="Title" value={v.title} onChange={(e) => setValue(i, "title", e.target.value)} />
                  <IconSelect set="values" value={v.icon} onChange={(icon) => setValue(i, "icon", icon)} />
                  <input placeholder="Description (optional)" value={v.description} onChange={(e) => setValue(i, "description", e.target.value)} />
                </div>
                <div className="adm-repeater__actions">
                  <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label="Remove" onClick={() => removeValue(i)}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <footer className="adm-form-actions">
          {!selfMode && (
            <Link className="adm-btn adm-btn--ghost" to="/admin/developers">Cancel</Link>
          )}
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create developer" : "Save changes"}
          </button>
        </footer>
      </form>
      )}
    </>
  );
}

/** Chosen countries as chips, plus a dropdown to add one. */
function CountryPicker({ value, onChange }) {
  const left = COUNTRIES.filter((c) => !value.includes(c.code));
  return (
    <div className="adm-country-chips">
      {value.map((code) => (
        <button
          key={code}
          type="button"
          className="adm-chip-btn is-active"
          aria-label={`Remove ${countryName(code)}`}
          onClick={() => onChange(value.filter((c) => c !== code))}
        >
          {countryName(code)} <span aria-hidden="true">✕</span>
        </button>
      ))}
      <select
        className="adm-inline-select"
        value=""
        aria-label="Add a country"
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
      >
        <option value="">{value.length ? "+ Add a country" : "Any country (add one to limit)"}</option>
        {left.map((c) => (
          <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
        ))}
      </select>
    </div>
  );
}
