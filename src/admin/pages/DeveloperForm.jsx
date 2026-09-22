import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DeveloperListings, DeveloperTeam } from "../components/DeveloperTabs.jsx";
import { api, getSession, isReifgoAdmin, isReifgoTier, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
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
  password: "",
  is_verified: false,
  is_approved: false,
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
  const navigate = useNavigate();
  const toast = useToast();

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
          password: "",
          tagline: d.tagline ?? "",
          years_in_market: d.years_in_market ?? "",
          total_projects: d.total_projects ?? "",
          international_hubs: d.international_hubs ?? "",
          hero_image_url: d.hero_image_url ?? "",
          is_verified: d.is_verified,
          is_approved: d.is_approved,
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

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

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

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
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
      ...(canModerate && (isNew || !meta?.email || isReifgoAdmin(session)) && form.email.trim() ? { email: form.email.trim() } : {}),
      ...(canModerate && form.password ? { password: form.password } : {}),
      ...(canModerate && {
        is_verified: form.is_verified,
        is_approved: form.is_approved,
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
        await api.post("/admin/developers", payload);
        toast.success("Developer created");
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
      <form className="adm-form" onSubmit={submit}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.name} onChange={set("name")} />
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
            {canModerate && !isNew && (
              meta?.email && !isReifgoAdmin(session) ? (
                <label className="adm-field">
                  <span className="adm-field__label">Sign-in email</span>
                  <input value={meta.email} disabled readOnly />
                  <span className="adm-field__hint">Used to sign in and for Forgot password. Only a REIFGO admin can change it.</span>
                </label>
              ) : meta?.email ? (
                <FormField label="Sign-in email" value={form.email} onChange={set("email")} hint="Used to sign in and for Forgot password. The developer can't change it themselves." />
              ) : (
                <FormField label="Sign-in email" value={form.email} onChange={set("email")} hint="Set once. Used to sign in and for Forgot password." />
              )
            )}
            {canModerate && isNew && (
              <FormField label="Sign-in email" value={form.email} onChange={set("email")} hint="Used to sign in and for Forgot password. It can't be changed later." />
            )}
            {canModerate && (
              <FormField
                label={isNew ? "Password" : "Set a new password"}
                type="password"
                value={form.password}
                onChange={set("password")}
                hint={isNew ? "At least 8 characters." : "Leave blank to keep the current password."}
              />
            )}
            {canModerate && (
              <>
                <FormField label="Verified" type="checkbox" value={form.is_verified} onChange={set("is_verified")} />
                <FormField label="Approved (visible in app)" type="checkbox" value={form.is_approved} onChange={set("is_approved")} />
              </>
            )}
          </div>
        </section>

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
                  <input placeholder="Icon, e.g. leaf-outline or mci:math-compass" value={v.icon} onChange={(e) => setValue(i, "icon", e.target.value)} />
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
