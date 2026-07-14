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
  const navigate = useNavigate();
  const toast = useToast();

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
