import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";

const EMPTY = {
  developer_id: "",
  name: "",
  location: "",
  asset_class: "",
  total_area: "",
  completion_date: "",
  min_entry_price: "",
  sustainability_rating: "",
  overview: "",
  status: "active",
  media: [],
  roi: { annual_return: "", capital_appreciation: "", rental_yield: "", exit_horizon: "" },
};

const num = (v) => (v === "" || v == null ? undefined : Number(v));
const str = (v) => (v === "" || v == null ? undefined : v);

export default function PropertyForm() {
  const { id } = useParams();
  const isNew = !id;
  const [form, setForm] = useState(EMPTY);
  const [developers, setDevelopers] = useState([]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api.get("/admin/developers").then(setDevelopers).catch((e) => toast.error(e.message));
    if (!isNew) {
      api
        .get(`/admin/properties/${id}`)
        .then((p) =>
          setForm({
            developer_id: p.developer_id,
            name: p.name ?? "",
            location: p.location ?? "",
            asset_class: p.asset_class ?? "",
            total_area: p.total_area ?? "",
            completion_date: p.completion_date ? p.completion_date.slice(0, 10) : "",
            min_entry_price: p.min_entry_price ?? "",
            sustainability_rating: p.sustainability_rating ?? "",
            overview: p.overview ?? "",
            status: p.status,
            media: (p.media ?? []).map((m) => ({ url: m.url, type: m.type })),
            roi: {
              annual_return: p.roi?.annual_return ?? "",
              capital_appreciation: p.roi?.capital_appreciation ?? "",
              rental_yield: p.roi?.rental_yield ?? "",
              exit_horizon: p.roi?.exit_horizon ?? "",
            },
          }),
        )
        .catch((e) => toast.error(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setRoi = (key) => (value) =>
    setForm((f) => ({ ...f, roi: { ...f.roi, [key]: value } }));

  const setMedia = (i, value) =>
    setForm((f) => ({
      ...f,
      media: f.media.map((m, j) => (j === i ? { ...m, url: value } : m)),
    }));
  const addMedia = () =>
    setForm((f) => ({ ...f, media: [...f.media, { url: "", type: "image" }] }));
  const removeMedia = (i) =>
    setForm((f) => ({ ...f, media: f.media.filter((_, j) => j !== i) }));
  const moveMedia = (i, dir) =>
    setForm((f) => {
      const media = [...f.media];
      const j = i + dir;
      if (j < 0 || j >= media.length) return f;
      [media[i], media[j]] = [media[j], media[i]];
      return { ...f, media };
    });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.developer_id) {
      toast.error("Pick a developer first");
      return;
    }
    setBusy(true);

    const roiValues = {
      annual_return: num(form.roi.annual_return),
      capital_appreciation: num(form.roi.capital_appreciation),
      rental_yield: num(form.roi.rental_yield),
      exit_horizon: str(form.roi.exit_horizon),
    };
    const hasRoi = Object.values(roiValues).some((v) => v !== undefined);

    const payload = {
      developer_id: form.developer_id,
      name: form.name,
      location: str(form.location),
      asset_class: str(form.asset_class),
      total_area: num(form.total_area),
      completion_date: str(form.completion_date),
      min_entry_price: num(form.min_entry_price),
      sustainability_rating: num(form.sustainability_rating),
      overview: str(form.overview),
      status: form.status,
      media: form.media
        .filter((m) => m.url.trim())
        .map((m, i) => ({ url: m.url.trim(), type: m.type || "image", display_order: i })),
      ...(hasRoi ? { roi: roiValues } : {}),
    };

    try {
      if (isNew) {
        await api.post("/admin/properties", payload);
        toast.success("Property created");
      } else {
        await api.patch(`/admin/properties/${id}`, payload);
        toast.success("Property saved");
      }
      navigate("/admin/properties");
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
            <Link to="/admin/properties">Properties</Link>
            <span>/</span>
            <span>{isNew ? "New" : form.name || "Edit"}</span>
          </nav>
          <h1>{isNew ? "New property" : form.name || "Edit property"}</h1>
        </div>
      </header>

      <form className="adm-form" onSubmit={submit}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            <FormField label="Name" required value={form.name} onChange={set("name")} span={2} />
            <FormField
              label="Developer"
              type="select"
              required
              value={form.developer_id}
              onChange={set("developer_id")}
              options={[
                { value: "", label: "Select a developer…" },
                ...developers.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <FormField
              label="Status"
              type="select"
              value={form.status}
              onChange={set("status")}
              options={[
                { value: "active", label: "Active" },
                { value: "coming_soon", label: "Coming soon" },
                { value: "sold_out", label: "Sold out" },
              ]}
            />
            <FormField label="Location" value={form.location} onChange={set("location")} placeholder="Dubai Marina, UAE" />
            <FormField label="Asset class" value={form.asset_class} onChange={set("asset_class")} placeholder="Multi-family" />
            <FormField label="Total area (sq ft)" type="number" value={form.total_area} onChange={set("total_area")} />
            <FormField label="Completion date" type="date" value={form.completion_date} onChange={set("completion_date")} />
            <FormField label="Min entry price ($)" type="number" value={form.min_entry_price} onChange={set("min_entry_price")} />
            <FormField label="Sustainability rating (0–5)" type="number" value={form.sustainability_rating} onChange={set("sustainability_rating")} />
            <FormField label="Overview" type="textarea" value={form.overview} onChange={set("overview")} span={2} />
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Media</h2>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={addMedia}>
              + Add image URL
            </button>
          </header>
          {form.media.length === 0 && (
            <p className="adm-panel__empty">No images yet. Add image URLs — the first one is the cover.</p>
          )}
          <ul className="adm-repeater">
            {form.media.map((m, i) => (
              <li key={i}>
                <span className="adm-repeater__index">{i + 1}</span>
                <input
                  type="url"
                  placeholder="https://…"
                  value={m.url}
                  onChange={(e) => setMedia(i, e.target.value)}
                />
                <div className="adm-repeater__actions">
                  <button type="button" className="adm-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => moveMedia(i, -1)}>↑</button>
                  <button type="button" className="adm-icon-btn" aria-label="Move down" disabled={i === form.media.length - 1} onClick={() => moveMedia(i, 1)}>↓</button>
                  <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label="Remove" onClick={() => removeMedia(i)}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head"><h2>ROI figures</h2></header>
          <div className="adm-form-grid adm-form-grid--4">
            <FormField label="Annual return (%)" type="number" value={form.roi.annual_return} onChange={setRoi("annual_return")} />
            <FormField label="Capital appreciation (%)" type="number" value={form.roi.capital_appreciation} onChange={setRoi("capital_appreciation")} />
            <FormField label="Rental yield (%)" type="number" value={form.roi.rental_yield} onChange={setRoi("rental_yield")} />
            <FormField label="Exit horizon" value={form.roi.exit_horizon} onChange={setRoi("exit_horizon")} placeholder="5 years" />
          </div>
        </section>

        <footer className="adm-form-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/properties">Cancel</Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create property" : "Save changes"}
          </button>
        </footer>
      </form>
    </>
  );
}
