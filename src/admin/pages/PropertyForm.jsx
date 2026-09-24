import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, getSession, isReifgoTier, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
import RowListEditor from "../components/RowListEditor.jsx";
import IconPicker, { IconPreview, IconSelect } from "../components/IconPicker.jsx";
import Modal from "../components/Modal.jsx";
import { mapServerErrors, summarise, validateProperty } from "../propertyValidation.js";

// Shown for an "Other" amenity until REIFGO adds it to the list with an icon.
const PLACEHOLDER_ICON = "mci:check-circle-outline";
const AMENITY_GROUPS = ["Building Amenities", "Unit Facilities"];
import { useToast } from "../components/Toast.jsx";
import { useCurrency } from "../currency.jsx";

const EMPTY = {
  developer_id: "",
  name: "",
  location: "",
  asset_class: "",
  // The app's overview card (Figma 722:115).
  payment_plan: "",
  property_type: "",
  ownership_type: "",
  total_area: "",
  completion_date: "",
  min_entry_price: "",
  sustainability_rating: "",
  overview: "",
  status: "active",
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

// Must match PROPERTY_TYPES in the backend DTO, which rejects anything else.
const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Commercial", "Mixed-Use"];

const num = (v) => (v === "" || v == null ? undefined : Number(v));
const str = (v) => (v === "" || v == null ? undefined : v);

export default function PropertyForm() {
  const { id } = useParams();
  const isNew = !id;
  // Opened from a developer's Properties tab: ?developer=<id>.
  const [search] = useSearchParams();
  const fromDeveloper = search.get("developer");
  const [form, setForm] = useState(() => ({ ...EMPTY, developer_id: fromDeveloper ?? "" }));
  // REIFGO adds or re-icons an amenity right from the picker (no separate page).
  const [amenityEdit, setAmenityEdit] = useState(null); // { rowIndex, id?, label, group_name, icon }
  const [developers, setDevelopers] = useState([]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { shownCurrency, fmtMoney, approximate } = useCurrency();
  const session = getSession();
  // Developer-side accounts only ever list under their own company, and their
  // saves go to REIFGO for approval.
  const isDeveloperAccount = !isReifgoTier(session);
  const [meta, setMeta] = useState(null);
  const [amenityOptions, setAmenityOptions] = useState([]);
  const [errors, setErrors] = useState({ fields: {}, rows: {}, other: [] });
  const summaryRef = useRef(null);

  useEffect(() => {
    api.get("/admin/amenities").then(setAmenityOptions).catch(() => {});
  }, []);

  const fieldError = (key) => errors.fields[key];
  const rowErrors = (section) => errors.rows[section] ?? {};
  const errorLines = summarise(errors);

  // Once the list has loaded, anything not in it is an "Other" amenity.
  useEffect(() => {
    if (!amenityOptions.length) return;
    const known = new Set(amenityOptions.map((o) => o.label.toLowerCase()));
    setForm((f) => ({
      ...f,
      amenities: f.amenities.map((a) => ({ ...a, custom: !!a.label && !known.has(a.label.toLowerCase()) })),
    }));
  }, [amenityOptions]);

  // Once the red marks are showing, re-check as the form is edited so each one
  // clears the moment it's fixed.
  useEffect(() => {
    if (!errorLines.length || errors.other.length) return;
    setErrors({ ...validateProperty(form, { needsDeveloper: !isDeveloperAccount }), other: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const scrollToField = (field) => {
    const el = field && document.querySelector(`[data-field="${field}"]`);
    (el ?? summaryRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    api.get("/admin/developers").then(setDevelopers).catch((e) => toast.error(e.message));
    if (!isNew) {
      api
        .get(`/admin/properties/${id}`)
        .then((p) => {
          setMeta({
            approval_status: p.approval_status,
            has_pending_changes: p.has_pending_changes,
            rejection_reason: p.rejection_reason,
          });
          return p;
        })
        .then((p) =>
          setForm({
            developer_id: p.developer_id,
            name: p.name ?? "",
            location: p.location ?? "",
            asset_class: p.asset_class ?? "",
            payment_plan: p.payment_plan ?? "",
            property_type: p.property_type ?? "",
            ownership_type: p.ownership_type ?? "",
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
              custom: false,
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

    // Check everything first and mark each problem in red, rather than
    // letting the server turn the whole save down with one message.
    const found = validateProperty(form, { needsDeveloper: !isDeveloperAccount });
    const lines = summarise(found);
    if (lines.length) {
      setErrors({ ...found, other: [] });
      toast.error(`${lines.length} thing${lines.length === 1 ? "" : "s"} to fix before saving`);
      requestAnimationFrame(() => scrollToField(lines[0].field));
      return;
    }
    setErrors({ fields: {}, rows: {}, other: [] });
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
      payment_plan: str(form.payment_plan?.trim()),
      property_type: str(form.property_type),
      ownership_type: str(form.ownership_type),
      total_area: num(form.total_area),
      completion_date: str(form.completion_date),
      min_entry_price: num(form.min_entry_price),
      sustainability_rating: num(form.sustainability_rating),
      overview: str(form.overview),
      status: form.status,
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
      // Picked amenities carry the list's icon; an "Other" one goes with a
      // placeholder icon and is sent to REIFGO to add properly.
      amenities: form.amenities
        .filter((a) => a.label.trim())
        .map((a, i) => ({
          group_name: str(a.group_name?.trim()) ?? "Building Amenities",
          icon: a.icon?.trim() || PLACEHOLDER_ICON,
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
        toast.success(isDeveloperAccount ? "Listing sent to REIFGO for approval" : "Property created");
      } else {
        const saved = await api.patch(`/admin/properties/${id}`, payload);
        toast.success(
          !isDeveloperAccount
            ? "Property saved"
            : meta?.approval_status !== "approved"
              ? "Listing updated and sent to REIFGO for approval"
              : saved?.nothing_changed
                ? saved.has_pending_changes === false && meta.has_pending_changes
                  ? "Everything matches the live listing again, so the waiting changes were withdrawn."
                  : "Nothing was changed, so nothing was sent to REIFGO."
                : "Changes sent to REIFGO. The live listing updates once they're approved.",
        );
      }
      navigate(backTo);
    } catch (err) {
      const mapped = mapServerErrors(err.message, err.details);
      const lines = summarise(mapped);
      if (lines.length && (Object.keys(mapped.fields).length || Object.keys(mapped.rows).length)) {
        setErrors(mapped);
        toast.error("Some fields need fixing. They're marked in red.");
        requestAnimationFrame(() => scrollToField(lines[0].field));
      } else {
        setErrors({ fields: {}, rows: {}, other: [err.message] });
        toast.error(err.message);
        requestAnimationFrame(() => scrollToField(null));
      }
      setBusy(false);
    }
  };

  // Where "Cancel", the breadcrumb and saving go back to.
  const backTo = isDeveloperAccount
    ? "/admin/properties"
    : form.developer_id
      ? `/admin/developers/${form.developer_id}?tab=properties`
      : "/admin/developers";
  const developerName = (developers.find((d) => d.id === form.developer_id)?.name ?? "").replace(/\s+/g, " ");
  const rowIndexOf = (row) => form.amenities.indexOf(row);

  const saveAmenity = async () => {
    const a = amenityEdit;
    if (!a.label.trim()) return toast.error("Give the amenity a name");
    if (!a.icon) return toast.error("Pick an icon");
    try {
      const body = { label: a.label.trim(), icon: a.icon, group_name: a.group_name };
      const saved = a.id ? await api.patch(`/admin/amenities/${a.id}`, body) : await api.post("/admin/amenities", body);
      const options = await api.get("/admin/amenities");
      setAmenityOptions(options);
      setForm((f) => ({
        ...f,
        amenities: f.amenities.map((row, i) =>
          i === a.rowIndex ? { ...row, custom: false, label: saved.label, icon: saved.icon, group_name: saved.group_name } : row,
        ),
      }));
      toast.success(a.id ? "Amenity updated for every listing that uses it" : `${saved.label} added to the amenity list`);
      setAmenityEdit(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const amenityOptionsByGroup = AMENITY_GROUPS.concat(
    [...new Set(amenityOptions.map((o) => o.group_name))].filter((g) => !AMENITY_GROUPS.includes(g)),
  ).map((group) => [group, amenityOptions.filter((o) => o.group_name === group)]);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            {isDeveloperAccount ? (
              <Link to="/admin/properties">Properties</Link>
            ) : (
              <>
                <Link to="/admin/developers">Developers</Link>
                <span>/</span>
                <Link to={backTo}>{developerName || "Developer"}</Link>
              </>
            )}
            <span>/</span>
            <span>{isNew ? "New listing" : form.name || "Edit"}</span>
          </nav>
          <h1>{isNew ? "New listing" : form.name || "Edit listing"}</h1>
        </div>
      </header>

      {isDeveloperAccount && isNew && (
        <p className="adm-note">New listings show in the app once REIFGO approves them.</p>
      )}
      {meta?.approval_status === "pending" && (
        <p className="adm-note adm-note--warn">Waiting for REIFGO to approve this listing. It isn't in the app yet.</p>
      )}
      {meta?.approval_status === "rejected" && (
        <p className="adm-note adm-note--danger">
          REIFGO declined this listing{meta.rejection_reason ? `: ${meta.rejection_reason}` : "."} Fix it and save to send it again.
        </p>
      )}
      {meta?.approval_status === "approved" && meta.has_pending_changes && (
        <p className="adm-note adm-note--warn">
          {isDeveloperAccount
            ? "You're seeing your latest changes. They're waiting for REIFGO; the app still shows the live version until they're approved."
            : "This listing has changes from the developer waiting in Approvals. Saving here edits the live listing directly."}
        </p>
      )}
      {meta?.approval_status === "approved" && !meta.has_pending_changes && meta.rejection_reason && isDeveloperAccount && (
        <p className="adm-note adm-note--danger">REIFGO declined your last changes: {meta.rejection_reason}</p>
      )}

      {errorLines.length > 0 && (
        <div className="adm-error-summary" ref={summaryRef} role="alert">
          <strong>
            {errors.other.length && errorLines.length === errors.other.length
              ? "The listing couldn't be saved:"
              : `Fix ${errorLines.length === 1 ? "this" : `these ${errorLines.length} things`} to save the listing:`}
          </strong>
          <ul>
            {errorLines.map((line, i) => (
              <li key={i}>
                {line.field ? (
                  <button type="button" onClick={() => scrollToField(line.field)}>{line.text}</button>
                ) : (
                  line.text
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="adm-form" onSubmit={submit} noValidate>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            <FormField label="Name" name="name" required value={form.name} onChange={set("name")} span={2} error={fieldError("name")} />
            {!isDeveloperAccount && (
              <FormField
                label="Developer"
                name="developer_id"
                error={fieldError("developer_id")}
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
            <FormField
              label="Property type"
              type="select"
              value={form.property_type}
              onChange={set("property_type")}
              options={[
                { value: "", label: "Not set" },
                ...PROPERTY_TYPES.map((t) => ({ value: t, label: t })),
              ]}
              hint="Shown on the app's overview card, and used by the listings filter."
            />
            <FormField
              label="Payment plan"
              value={form.payment_plan}
              onChange={set("payment_plan")}
              placeholder="60/40"
            />
            <FormField
              label="Ownership type"
              type="select"
              value={form.ownership_type}
              onChange={set("ownership_type")}
              options={[
                { value: "", label: "Not set" },
                { value: "Freehold", label: "Freehold" },
                { value: "Leasehold", label: "Leasehold" },
              ]}
            />
            <FormField label="Total area (sq ft)" name="total_area" error={fieldError("total_area")} type="number" value={form.total_area} onChange={set("total_area")} />
            <FormField label="Completion date" name="completion_date" error={fieldError("completion_date")} type="date" value={form.completion_date} onChange={set("completion_date")} />
            <FormField
              label="Min entry price (USD)"
              name="min_entry_price"
              error={fieldError("min_entry_price")}
              type="number"
              value={form.min_entry_price}
              onChange={set("min_entry_price")}
              hint={
                shownCurrency !== "USD" && form.min_entry_price
                  ? `≈ ${fmtMoney(form.min_entry_price)}${approximate ? " at today's rate" : ""}. Prices are entered in USD.`
                  : "Prices are entered in USD"
              }
            />
            <FormField label="Sustainability rating (0–5)" name="sustainability_rating" error={fieldError("sustainability_rating")} type="number" value={form.sustainability_rating} onChange={set("sustainability_rating")} />
            <FormField label="Overview" name="overview" error={fieldError("overview")} type="textarea" value={form.overview} onChange={set("overview")} span={2} />
          </div>
        </section>

        <section className={`adm-panel${Object.keys(rowErrors("media")).length ? " adm-panel--error" : ""}`} data-field="media">
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
                    rowErrors("media")[i] ? "adm-media-row--error" : "",
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
                  {rowErrors("media")[i]?.url && (
                    <span className="adm-rowfield__error" role="alert">{rowErrors("media")[i].url}</span>
                  )}
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
              name="construction_progress"
              error={fieldError("construction_progress")}
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
          <div className="adm-form-grid adm-form-grid--4" data-field="roi">
            <FormField label="Annual return (%)" error={fieldError("roi.annual_return")} type="number" value={form.roi.annual_return} onChange={setRoi("annual_return")} />
            <FormField label="Capital appreciation (%)" error={fieldError("roi.capital_appreciation")} type="number" value={form.roi.capital_appreciation} onChange={setRoi("capital_appreciation")} />
            <FormField label="Rental yield (%)" error={fieldError("roi.rental_yield")} type="number" value={form.roi.rental_yield} onChange={setRoi("rental_yield")} />
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
          name="unit_types"
          errors={rowErrors("unit_types")}
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
          hint="Pick from the list. If it isn't there, choose Other and type it: REIFGO is told, adds it with the right icon, and it updates on this listing."
          emptyText="No amenities yet."
          addLabel="+ Add amenity"
          rows={form.amenities}
          onChange={set("amenities")}
          name="amenities"
          errors={rowErrors("amenities")}
          blank={{ group_name: "Building Amenities", icon: "", label: "", custom: false }}
          columns={[
            {
              key: "amenity",
              label: "Amenity",
              flex: 3,
              minWidth: 260,
              render: (row, update) => (
                <>
                  <span className="adm-amenity-cell">
                    <IconPreview name={row.custom ? PLACEHOLDER_ICON : row.icon} />
                    <select
                      value={row.custom ? "__other__" : row.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__other__") {
                          update({ custom: true, label: "", icon: PLACEHOLDER_ICON });
                        } else {
                          const o = amenityOptions.find((x) => x.label === v);
                          update(o ? { custom: false, label: o.label, icon: o.icon, group_name: o.group_name } : { custom: false, label: "", icon: "" });
                        }
                      }}
                    >
                      <option value="">Choose an amenity…</option>
                      {amenityOptionsByGroup.map(([group, opts]) =>
                        opts.length ? (
                          <optgroup key={group} label={group}>
                            {opts.map((o) => (
                              <option key={o.id} value={o.label}>{o.label}</option>
                            ))}
                          </optgroup>
                        ) : null,
                      )}
                      <option value="__other__">Other (not in the list)…</option>
                    </select>
                  </span>
                  {row.custom && (
                    <span className="adm-amenity-cell" style={{ marginTop: 6 }}>
                      <input
                        value={row.label}
                        placeholder="Type the amenity, e.g. Padel Court"
                        onChange={(e) => update("label", e.target.value)}
                      />
                      <select value={row.group_name || "Building Amenities"} onChange={(e) => update("group_name", e.target.value)}>
                        {AMENITY_GROUPS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </span>
                  )}
                  {row.custom && isDeveloperAccount && (
                    <span className="adm-field__hint">REIFGO will be asked to add this with an icon.</span>
                  )}
                  {/* REIFGO manages the amenity list right here. */}
                  {!isDeveloperAccount && row.custom && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--sm"
                      style={{ marginTop: 6, alignSelf: "flex-start" }}
                      disabled={!row.label.trim()}
                      onClick={() => setAmenityEdit({ rowIndex: rowIndexOf(row), label: row.label.trim(), group_name: row.group_name || "Building Amenities", icon: "" })}
                    >
                      + Add "{row.label.trim() || "…"}" to the list with an icon
                    </button>
                  )}
                  {!isDeveloperAccount && !row.custom && row.label && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--sm"
                      style={{ marginTop: 6, alignSelf: "flex-start" }}
                      onClick={() => {
                        const o = amenityOptions.find((x) => x.label === row.label);
                        if (o) setAmenityEdit({ rowIndex: rowIndexOf(row), id: o.id, label: o.label, group_name: o.group_name, icon: o.icon });
                      }}
                    >
                      Change icon or name
                    </button>
                  )}
                </>
              ),
            },
          ]}
        />

        <RowListEditor
          title="Nearby places"
          hint="Distance drives both the printed figure and the length of the bar, which is scaled against the furthest place on this property."
          emptyText="No nearby places yet."
          addLabel="+ Add place"
          rows={form.nearby_places}
          onChange={set("nearby_places")}
          name="nearby_places"
          errors={rowErrors("nearby_places")}
          blank={{ name: "", icon: "", travel_minutes: "", travel_mode: "drive", distance_km: "" }}
          columns={[
            { key: "name", label: "Name", placeholder: "Marina Mall", flex: 1.6 },
            {
              key: "icon",
              label: "Icon",
              flex: 1.3,
              minWidth: 170,
              render: (row, update) => <IconSelect set="places" value={row.icon} onChange={(icon) => update("icon", icon)} />,
            },
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
          name="faqs"
          errors={rowErrors("faqs")}
          blank={{ question: "", answer: "" }}
          columns={[
            { key: "question", label: "Question", placeholder: "What is the payment plan?", flex: 1, minWidth: 200 },
            { key: "answer", label: "Answer", multiline: true, flex: 1.6, minWidth: 240 },
          ]}
        />

        <footer className="adm-form-actions">
          <Link className="adm-btn adm-btn--ghost" to={backTo}>Cancel</Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create property" : "Save changes"}
          </button>
        </footer>
      </form>
      {amenityEdit && (
        <Modal
          title={amenityEdit.id ? `Edit ${amenityEdit.label}` : "Add to the amenity list"}
          onClose={() => setAmenityEdit(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setAmenityEdit(null)}>Cancel</button>
              <button className="adm-btn adm-btn--primary" onClick={saveAmenity}>
                {amenityEdit.id ? "Save for every listing" : "Add amenity"}
              </button>
            </>
          }
        >
          <p className="adm-tl__meta" style={{ marginBottom: 12 }}>
            {amenityEdit.id
              ? "Changes here apply to every listing that has this amenity."
              : "It joins the list every developer picks from."}
          </p>
          <div className="adm-form-grid">
            <FormField label="Name" value={amenityEdit.label} onChange={(v) => setAmenityEdit((x) => ({ ...x, label: v }))} />
            <FormField
              label="Group"
              type="select"
              value={amenityEdit.group_name}
              onChange={(v) => setAmenityEdit((x) => ({ ...x, group_name: v }))}
              options={AMENITY_GROUPS.map((g) => ({ value: g, label: g }))}
            />
            <IconPicker value={amenityEdit.icon} onChange={(v) => setAmenityEdit((x) => ({ ...x, icon: v }))} />
          </div>
        </Modal>
      )}
    </>
  );
}
