import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getSession, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
import RowListEditor from "../components/RowListEditor.jsx";
import { useToast } from "../components/Toast.jsx";
import { useCurrency, USD_TO_AED } from "../currency.jsx";

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
  channels: { app: true, website: true },
  media: [],
  roi: { annual_return: "", capital_appreciation: "", rental_yield: "", exit_horizon: "" },
  construction_progress: "",
  progress_verified_at: "",
  handover: "",
  permits: "",
  // The lower half of the property page (Figma 722:57).
  unit_types: [],
  amenities: [],
  nearby_places: [],
  faqs: [],
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
  const { currency } = useCurrency();
  const session = getSession();
  // Developer accounts only ever list under their own company.
  const isDeveloperAccount = session?.role === "developer";

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
            channels: { app: p.channels?.app ?? true, website: p.channels?.website ?? true },
            media: (p.media ?? []).map((m) => ({ url: m.url, type: m.type })),
            roi: {
              annual_return: p.roi?.annual_return ?? "",
              capital_appreciation: p.roi?.capital_appreciation ?? "",
              rental_yield: p.roi?.rental_yield ?? "",
              exit_horizon: p.roi?.exit_horizon ?? "",
            },
            construction_progress:
              p.construction_progress == null ? "" : String(p.construction_progress),
            progress_verified_at: p.progress_verified_at
              ? p.progress_verified_at.slice(0, 10)
              : "",
            handover: p.handover ?? "",
            // Edited as one comma-separated line; stored as an array.
            permits: (p.permits ?? []).join(", "),
            // Numbers become strings for the inputs; blanks stay blank rather
            // than becoming a literal 0 the editor would have to clear.
            unit_types: (p.unit_types ?? []).map((u) => ({
              name: u.name ?? "",
              min_area: u.min_area ?? "",
              max_area: u.max_area ?? "",
              from_price: u.from_price ?? "",
              floor_plan_url: u.floor_plan_url ?? "",
            })),
            amenities: (p.amenities ?? []).map((a) => ({
              group_name: a.group_name ?? "",
              icon: a.icon ?? "",
              label: a.label ?? "",
            })),
            nearby_places: (p.nearby_places ?? []).map((n) => ({
              name: n.name ?? "",
              icon: n.icon ?? "",
              travel_minutes: n.travel_minutes ?? "",
              travel_mode: n.travel_mode ?? "drive",
              distance_km: n.distance_km ?? "",
            })),
            faqs: (p.faqs ?? []).map((f) => ({
              question: f.question ?? "",
              answer: f.answer ?? "",
            })),
          }),
        )
        .catch((e) => toast.error(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setRoi = (key) => (value) =>
    setForm((f) => ({ ...f, roi: { ...f.roi, [key]: value } }));

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onFilesPicked = async (e) => {
    const files = [...e.target.files];
    e.target.value = ""; // allow re-picking the same file
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { url } = await uploadImage(file);
        setForm((f) => ({ ...f, media: [...f.media, { url, type: "image" }] }));
      } catch (err) {
        toast.error(`${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
  };

  const setMedia = (i, value) =>
    setForm((f) => ({
      ...f,
      media: f.media.map((m, j) => (j === i ? { ...m, url: value } : m)),
    }));
  const addMedia = () =>
    setForm((f) => ({ ...f, media: [...f.media, { url: "", type: "image" }] }));
  const removeMedia = (i) =>
    setForm((f) => ({ ...f, media: f.media.filter((_, j) => j !== i) }));
  // The source index is held in a ref as well as state. State drives the
  // styling; the ref is what the drop reads, because if dragstart and drop
  // land in the same tick React has not re-rendered and the handler would
  // still close over a null source.
  const dragFromRef = useRef(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  /**
   * Moves one image to another position, closing the gap behind it. Display
   * order is the array order -- the payload numbers them on save -- so this is
   * the whole of "set the display priority".
   */
  const reorderMedia = (from, to) =>
    setForm((f) => {
      if (from == null || to == null || from === to) return f;
      const media = [...f.media];
      const [moved] = media.splice(from, 1);
      media.splice(to, 0, moved);
      return { ...f, media };
    });

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
    const developer_id = isDeveloperAccount
      ? form.developer_id || session.developer_id
      : form.developer_id;
    if (!developer_id) {
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
      developer_id,
      name: form.name,
      location: str(form.location),
      asset_class: str(form.asset_class),
      total_area: num(form.total_area),
      completion_date: str(form.completion_date),
      min_entry_price: num(form.min_entry_price),
      sustainability_rating: num(form.sustainability_rating),
      overview: str(form.overview),
      status: form.status,
      channels: form.channels,
      media: form.media
        .filter((m) => m.url.trim())
        .map((m, i) => ({ url: m.url.trim(), type: m.type || "image", display_order: i })),
      construction_progress: num(form.construction_progress),
      progress_verified_at: form.progress_verified_at
        ? new Date(form.progress_verified_at).toISOString()
        : undefined,
      handover: str(form.handover),
      permits: form.permits
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      // Rows are ordered by their position in the list, so display_order is
      // written from the index and never edited by hand. Blank rows are dropped
      // rather than saved as empty tiles.
      unit_types: form.unit_types
        .filter((u) => u.name.trim())
        .map((u, i) => ({
          name: u.name.trim(),
          min_area: num(u.min_area),
          max_area: num(u.max_area),
          from_price: num(u.from_price),
          floor_plan_url: str(u.floor_plan_url?.trim()),
          display_order: i,
        })),
      amenities: form.amenities
        .filter((a) => a.label.trim() && a.icon.trim())
        .map((a, i) => ({
          group_name: str(a.group_name?.trim()) ?? "Amenities",
          icon: a.icon.trim(),
          label: a.label.trim(),
          display_order: i,
        })),
      nearby_places: form.nearby_places
        .filter((n) => n.name.trim() && n.icon.trim() && n.distance_km !== "")
        .map((n, i) => ({
          name: n.name.trim(),
          icon: n.icon.trim(),
          travel_minutes: num(n.travel_minutes),
          travel_mode: n.travel_mode || "drive",
          distance_km: Number(n.distance_km),
          display_order: i,
        })),
      faqs: form.faqs
        .filter((f) => f.question.trim() && f.answer.trim())
        .map((f, i) => ({
          question: f.question.trim(),
          answer: f.answer.trim(),
          display_order: i,
        })),
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
            {!isDeveloperAccount && (
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
            )}
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
            <FormField
              label="Min entry price (USD)"
              type="number"
              value={form.min_entry_price}
              onChange={set("min_entry_price")}
              hint={
                currency === "AED" && form.min_entry_price
                  ? `≈ AED ${Math.round(Number(form.min_entry_price) * USD_TO_AED).toLocaleString()}`
                  : "Prices are stored in USD"
              }
            />
            <FormField label="Sustainability rating (0–5)" type="number" value={form.sustainability_rating} onChange={set("sustainability_rating")} />
            <FormField label="Overview" type="textarea" value={form.overview} onChange={set("overview")} span={2} />
            <FormField
              label="Show in the app"
              type="checkbox"
              value={form.channels.app}
              onChange={(v) => setForm((f) => ({ ...f, channels: { ...f.channels, app: v } }))}
            />
            <FormField
              label="Show on the website"
              type="checkbox"
              value={form.channels.website}
              onChange={(v) => setForm((f) => ({ ...f, channels: { ...f.channels, website: v } }))}
            />
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Media</h2>
            <div className="adm-panel__head-actions">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={onFilesPicked}
              />
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "↑ Upload images"}
              </button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={addMedia}>
                + Add URL
              </button>
            </div>
          </header>
          {form.media.length === 0 && (
            <p className="adm-panel__empty">No images yet. Upload files or paste URLs — the first one is the cover.</p>
          )}
          {form.media.length > 1 && (
            <p className="adm-panel__note adm-panel__pad">
              Drag a row to set the display order. The first image is the cover.
            </p>
          )}
          <ul className="adm-repeater">
            {form.media.map((m, i) => {
              const isUploaded = m.url.startsWith("data:");
              return (
                <li
                  key={i}
                  draggable
                  onDragStart={() => {
                    dragFromRef.current = i;
                    setDragFrom(i);
                  }}
                  onDragOver={(e) => {
                    // Without preventDefault the browser refuses the drop.
                    e.preventDefault();
                    if (dragOver !== i) setDragOver(i);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    reorderMedia(dragFromRef.current, i);
                    dragFromRef.current = null;
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                  onDragEnd={() => {
                    dragFromRef.current = null;
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                  className={[
                    dragFrom === i ? "is-dragging" : "",
                    dragOver === i && dragFrom !== i ? "is-drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* The arrows stay: dragging is not reachable by keyboard. */}
                  <span className="adm-repeater__grip" aria-hidden="true">⠿</span>
                  <span className="adm-repeater__index">{i + 1}</span>
                  {m.url ? (
                    <img className="adm-thumb" src={m.url} alt="" />
                  ) : (
                    <span className="adm-thumb adm-thumb--empty" />
                  )}
                  <input
                    type={isUploaded ? "text" : "url"}
                    placeholder="https://…"
                    value={isUploaded ? "Uploaded image" : m.url}
                    disabled={isUploaded}
                    onChange={(e) => setMedia(i, e.target.value)}
                  />
                  <div className="adm-repeater__actions">
                    <button type="button" className="adm-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => moveMedia(i, -1)}>↑</button>
                    <button type="button" className="adm-icon-btn" aria-label="Move down" disabled={i === form.media.length - 1} onClick={() => moveMedia(i, 1)}>↓</button>
                    <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label="Remove" onClick={() => removeMedia(i)}>✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>RERA verification</h2>
            <p className="adm-panel__note">
              Leave the progress blank to hide the verification panel on the app.
            </p>
          </header>
          <div className="adm-form-grid">
            <FormField
              label="Construction progress (%)"
              type="number"
              value={form.construction_progress}
              onChange={set("construction_progress")}
              placeholder="65"
            />
            <FormField
              label="Progress verified on"
              type="date"
              value={form.progress_verified_at}
              onChange={set("progress_verified_at")}
            />
            <FormField
              label="Handover"
              value={form.handover}
              onChange={set("handover")}
              placeholder="Q4 2026"
            />
            <FormField
              label="Permits held"
              value={form.permits}
              onChange={set("permits")}
              placeholder="Building Permit, Land Title, Environmental"
            />
          </div>
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

        {/* ── The lower half of the property page, per Figma 722:57 ── */}

        <RowListEditor
          title="Unit types"
          hint="Shown as the Unit Types rail, and as the Floor Plan tabs for any row with a plan URL."
          emptyText="No unit types yet. Add one per configuration on offer."
          addLabel="+ Add unit type"
          rows={form.unit_types}
          onChange={set("unit_types")}
          blank={{ name: "", min_area: "", max_area: "", from_price: "", floor_plan_url: "" }}
          columns={[
            { key: "name", label: "Name", placeholder: "2BHK", flex: 1 },
            { key: "min_area", label: "Min sqft", type: "number", placeholder: "850", flex: 1 },
            { key: "max_area", label: "Max sqft", type: "number", placeholder: "920", flex: 1 },
            { key: "from_price", label: "From price", type: "number", placeholder: "550000", flex: 1 },
            { key: "floor_plan_url", label: "Floor plan URL", placeholder: "https://…", flex: 2, minWidth: 200 },
          ]}
        />

        <RowListEditor
          title="Amenities & facilities"
          hint="Group is the sub-heading the tile sits under, e.g. Building Amenities or Unit Facilities. Icon is an Ionicons name such as water-outline or barbell-outline."
          emptyText="No amenities yet."
          addLabel="+ Add amenity"
          rows={form.amenities}
          onChange={set("amenities")}
          blank={{ group_name: "Building Amenities", icon: "", label: "" }}
          columns={[
            { key: "group_name", label: "Group", placeholder: "Building Amenities", flex: 1.4 },
            { key: "icon", label: "Icon", placeholder: "water-outline", flex: 1.2 },
            { key: "label", label: "Label", placeholder: "Swimming Pool", flex: 1.4 },
          ]}
        />

        <RowListEditor
          title="Nearby places"
          hint="Distance drives both the printed figure and the length of the bar, which is scaled against the furthest place on this property."
          emptyText="No nearby places yet."
          addLabel="+ Add place"
          rows={form.nearby_places}
          onChange={set("nearby_places")}
          blank={{ name: "", icon: "", travel_minutes: "", travel_mode: "drive", distance_km: "" }}
          columns={[
            { key: "name", label: "Name", placeholder: "Marina Mall", flex: 1.6 },
            { key: "icon", label: "Icon", placeholder: "bag-outline", flex: 1.2 },
            { key: "travel_minutes", label: "Minutes", type: "number", placeholder: "10", flex: 0.8 },
            {
              key: "travel_mode",
              label: "Mode",
              flex: 0.9,
              options: [
                { value: "drive", label: "Drive" },
                { value: "walk", label: "Walk" },
              ],
            },
            { key: "distance_km", label: "Distance (km)", type: "number", placeholder: "2.5", flex: 1 },
          ]}
        />

        <RowListEditor
          title="Frequently asked questions"
          hint="The first question is open when the page loads."
          emptyText="No questions yet."
          addLabel="+ Add question"
          rows={form.faqs}
          onChange={set("faqs")}
          blank={{ question: "", answer: "" }}
          columns={[
            { key: "question", label: "Question", placeholder: "What is the payment plan?", flex: 1, minWidth: 200 },
            { key: "answer", label: "Answer", multiline: true, flex: 1.6, minWidth: 240 },
          ]}
        />

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
