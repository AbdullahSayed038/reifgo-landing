import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";

const EMPTY = {
  title: "",
  date: "",
  location: "",
  type: "in_person",
  pass_type: "",
  description: "",
  image_url: "",
  entry_fee: "",
  venue_address: "",
  host_name: "",
  host_role: "",
  host_photo_url: "",
  meeting_platform: "",
  meeting_url: "",
  meeting_access_minutes: "",
  property_ids: [],
  developer_ids: [],
  channels: { app: true, website: true },
};

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const str = (v) => (v === "" || v == null ? undefined : v);

export default function EventForm() {
  const { id } = useParams();
  const isNew = !id;
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [properties, setProperties] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  // Scoped by the signed-in role server-side, so a developer only ever picks
  // from their own projects.
  useEffect(() => {
    api.get("/admin/properties").then(setProperties).catch(() => {});
    api.get("/admin/developers").then(setDevelopers).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/events/${id}`)
      .then((ev) =>
        setForm({
          title: ev.title ?? "",
          date: ev.date ? toLocalInput(ev.date) : "",
          location: ev.location ?? "",
          type: ev.type,
          pass_type: ev.pass_type ?? "",
          description: ev.description ?? "",
          image_url: ev.image_url ?? "",
          entry_fee: ev.entry_fee ?? "",
          venue_address: ev.venue_address ?? "",
          host_name: ev.host_name ?? "",
          host_role: ev.host_role ?? "",
          host_photo_url: ev.host_photo_url ?? "",
          meeting_platform: ev.meeting_platform ?? "",
          meeting_url: ev.meeting_url ?? "",
          meeting_access_minutes:
            ev.meeting_access_minutes == null ? "" : String(ev.meeting_access_minutes),
          // The API returns join rows; the form works in plain id lists.
          property_ids: (ev.properties ?? []).map((r) => r.property_id ?? r.property?.id),
          developer_ids: (ev.developers ?? []).map((r) => r.developer_id ?? r.developer?.id),
          channels: { app: ev.channels?.app ?? true, website: ev.channels?.website ?? true },
        }),
      )
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.date) {
      toast.error("Pick a date and time");
      return;
    }
    setBusy(true);

    const payload = {
      title: form.title,
      date: new Date(form.date).toISOString(),
      location: str(form.location),
      type: form.type,
      pass_type: str(form.pass_type),
      description: str(form.description),
      image_url: str(form.image_url),
      entry_fee: str(form.entry_fee),
      venue_address: str(form.venue_address),
      host_name: str(form.host_name),
      host_role: str(form.host_role),
      host_photo_url: str(form.host_photo_url),
      meeting_platform: str(form.meeting_platform),
      meeting_url: str(form.meeting_url),
      meeting_access_minutes:
        form.meeting_access_minutes === "" ? undefined : Number(form.meeting_access_minutes),
      // Always sent, even when empty: the API replaces these lists wholesale,
      // so an omitted list would mean "leave alone" and a removal would not
      // stick.
      property_ids: form.property_ids,
      developer_ids: form.developer_ids,
      channels: form.channels,
    };

    try {
      if (isNew) {
        await api.post("/admin/events", payload);
        toast.success("Event created");
      } else {
        await api.patch(`/admin/events/${id}`, payload);
        toast.success("Event saved");
      }
      navigate("/admin/events");
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
            <Link to="/admin/events">Events</Link>
            <span>/</span>
            <span>{isNew ? "New" : form.title || "Edit"}</span>
          </nav>
          <h1>{isNew ? "New event" : form.title || "Edit event"}</h1>
        </div>
      </header>

      <form className="adm-form" onSubmit={submit}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Details</h2></header>
          <div className="adm-form-grid">
            <FormField label="Title" required value={form.title} onChange={set("title")} span={2} />
            <FormField label="Date & time" type="datetime-local" required value={form.date} onChange={set("date")} />
            <FormField
              label="Type"
              type="select"
              value={form.type}
              onChange={set("type")}
              options={[
                { value: "in_person", label: "In person" },
                { value: "virtual", label: "Virtual" },
              ]}
            />
            <FormField label="Location" value={form.location} onChange={set("location")} placeholder="Marina Bay Sands, Singapore" />
            <FormField label="Pass type" value={form.pass_type} onChange={set("pass_type")} placeholder="Investor pass" />
            <FormField label="Description" type="textarea" value={form.description} onChange={set("description")} span={2} />
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
          <header className="adm-panel__head"><h2>Presentation</h2></header>
          <div className="adm-form-grid">
            <FormField
              label="Hero image URL"
              value={form.image_url}
              onChange={set("image_url")}
              placeholder="https://…"
              span={2}
            />
            <FormField
              label="Entry fee"
              value={form.entry_fee}
              onChange={set("entry_fee")}
              placeholder="Free"
            />
            <FormField
              label="Venue address"
              value={form.venue_address}
              onChange={set("venue_address")}
              placeholder="ExCeL London, Royal Victoria Dock, E16 1XL"
            />
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Host</h2>
            <p className="adm-panel__note">Leave blank to hide the section on the app.</p>
          </header>
          <div className="adm-form-grid">
            <FormField label="Name" value={form.host_name} onChange={set("host_name")} />
            <FormField label="Role" value={form.host_role} onChange={set("host_role")} placeholder="Investor Advisor" />
            <FormField label="Photo URL" value={form.host_photo_url} onChange={set("host_photo_url")} span={2} placeholder="https://…" />
          </div>
        </section>

        {form.type === "virtual" && (
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Online meeting</h2></header>
            <div className="adm-form-grid">
              <FormField label="Platform" value={form.meeting_platform} onChange={set("meeting_platform")} placeholder="Microsoft Teams" />
              <FormField
                label="Access opens (minutes before)"
                type="number"
                value={form.meeting_access_minutes}
                onChange={set("meeting_access_minutes")}
                placeholder="10"
              />
              <FormField label="Join URL" value={form.meeting_url} onChange={set("meeting_url")} span={2} placeholder="https://…" />
            </div>
          </section>
        )}

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Featured projects</h2>
            <p className="adm-panel__note">Shown on the event page, in the order picked.</p>
          </header>
          <MultiPicker
            options={properties.map((p) => ({ id: p.id, label: p.name, meta: p.location }))}
            selected={form.property_ids}
            onChange={set("property_ids")}
            empty="No properties available."
          />
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Presenting developers</h2>
            <p className="adm-panel__note">Shown on the event page, in the order picked.</p>
          </header>
          <MultiPicker
            options={developers.map((d) => ({ id: d.id, label: (d.name || "").replace(/\s+/g, " ") }))}
            selected={form.developer_ids}
            onChange={set("developer_ids")}
            empty="No developers available."
          />
        </section>

        <footer className="adm-form-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/events">Cancel</Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create event" : "Save changes"}
          </button>
        </footer>
      </form>
    </>
  );
}

/**
 * Checkbox list that remembers the order things were picked in, because the
 * API stores display_order from the array position — so the order here is the
 * order on the app, and re-picking should not silently reshuffle the rail.
 */
function MultiPicker({ options, selected, onChange, empty }) {
  if (!options.length) return <p className="adm-panel__note adm-panel__pad">{empty}</p>;

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <ul className="adm-picker">
      {options.map((o) => {
        const at = selected.indexOf(o.id);
        return (
          <li key={o.id}>
            <label className="adm-picker__row">
              <input type="checkbox" checked={at > -1} onChange={() => toggle(o.id)} />
              <span className="adm-picker__label">
                {o.label}
                {o.meta ? <em className="adm-picker__meta">{o.meta}</em> : null}
              </span>
              {at > -1 ? <span className="adm-picker__order">{at + 1}</span> : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
