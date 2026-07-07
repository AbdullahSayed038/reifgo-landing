import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";

const EMPTY = {
  name: "",
  tagline: "",
  years_in_market: "",
  total_projects: "",
  international_hubs: "",
  hero_image_url: "",
  is_verified: false,
  is_approved: false,
  values: [],
};

const num = (v) => (v === "" || v == null ? undefined : Number(v));
const str = (v) => (v === "" || v == null ? undefined : v);

export default function DeveloperForm() {
  const { id } = useParams();
  const isNew = !id;
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/developers/${id}`)
      .then((d) =>
        setForm({
          name: d.name ?? "",
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
      is_verified: form.is_verified,
      is_approved: form.is_approved,
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
        await api.patch(`/admin/developers/${id}`, payload);
        toast.success("Developer saved");
      }
      navigate("/admin/developers");
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to="/admin/developers">Developers</Link>
            <span>/</span>
            <span>{isNew ? "New" : form.name || "Edit"}</span>
          </nav>
          <h1>{isNew ? "New developer" : form.name || "Edit developer"}</h1>
        </div>
      </header>

      <form className="adm-form" onSubmit={submit}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.name} onChange={set("name")} />
            <FormField label="Tagline" value={form.tagline} onChange={set("tagline")} placeholder="Building tomorrow's skylines" />
            <FormField label="Years in market" type="number" value={form.years_in_market} onChange={set("years_in_market")} />
            <FormField label="Total projects" type="number" value={form.total_projects} onChange={set("total_projects")} />
            <FormField label="International hubs" value={form.international_hubs} onChange={set("international_hubs")} placeholder="Dubai · London · New York" />
            <FormField label="Hero image URL" type="url" value={form.hero_image_url} onChange={set("hero_image_url")} placeholder="https://…" />
            <FormField label="Verified" type="checkbox" value={form.is_verified} onChange={set("is_verified")} />
            <FormField label="Approved (visible in app)" type="checkbox" value={form.is_approved} onChange={set("is_approved")} />
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
                  <input placeholder="Icon key (optional)" value={v.icon} onChange={(e) => setValue(i, "icon", e.target.value)} />
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
          <Link className="adm-btn adm-btn--ghost" to="/admin/developers">Cancel</Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create developer" : "Save changes"}
          </button>
        </footer>
      </form>
    </>
  );
}
