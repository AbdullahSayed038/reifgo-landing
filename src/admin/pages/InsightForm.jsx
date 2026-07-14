import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getSession, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";

const CATEGORIES = ["Market Report", "Interview", "Guide", "Announcement"];

const EMPTY = {
  title: "",
  category: "Market Report",
  excerpt: "",
  body: "",
  cover_url: "",
  author_name: "REIFGO Research",
  channels: { app: true, website: false },
  published: false,
};

const str = (v) => (v === "" || v == null ? undefined : v);

export default function InsightForm() {
  const { id } = useParams();
  const isNew = !id;
  const session = getSession();
  const isDeveloper = session?.role === "developer";
  const [form, setForm] = useState(() =>
    isDeveloper ? { ...EMPTY, author_name: session.name } : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/insights/${id}`)
      .then((i) =>
        setForm({
          title: i.title ?? "",
          category: i.category ?? "Market Report",
          excerpt: i.excerpt ?? "",
          body: i.body ?? "",
          cover_url: i.cover_url ?? "",
          author_name: i.author_name ?? "",
          channels: { app: !!i.channels?.app, website: !!i.channels?.website },
          published: !!i.published,
        }),
      )
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setChannel = (key) => (value) =>
    setForm((f) => ({ ...f, channels: { ...f.channels, [key]: value } }));

  const onCoverPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      set("cover_url")(url);
    } catch (err) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim()) {
      toast.error("Give the insight a title");
      return;
    }
    setBusy(true);

    const payload = {
      title: form.title.trim(),
      category: form.category,
      excerpt: str(form.excerpt),
      body: str(form.body),
      cover_url: str(form.cover_url),
      author_name: str(form.author_name),
      channels: form.channels,
      published: form.published,
    };

    try {
      if (isNew) {
        await api.post("/admin/insights", payload);
        toast.success("Insight created");
      } else {
        await api.patch(`/admin/insights/${id}`, payload);
        toast.success("Insight saved");
      }
      navigate("/admin/insights");
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const isDataCover = form.cover_url.startsWith("data:");

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to="/admin/insights">Insights</Link>
            <span>/</span>
            <span>{isNew ? "New" : form.title || "Edit"}</span>
          </nav>
          <h1>{isNew ? "New insight" : form.title || "Edit insight"}</h1>
        </div>
      </header>

      <form className="adm-form" onSubmit={submit}>
        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Content</h2></header>
          <div className="adm-form-grid">
            <FormField label="Title" required value={form.title} onChange={set("title")} span={2} />
            <FormField
              label="Category"
              type="select"
              value={form.category}
              onChange={set("category")}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <FormField
              label="Author"
              value={form.author_name}
              onChange={set("author_name")}
              hint={isDeveloper ? "Published under your company" : undefined}
            />
            <FormField
              label="Excerpt"
              type="textarea"
              value={form.excerpt}
              onChange={set("excerpt")}
              span={2}
              hint="Short summary shown on cards (website + app)"
            />
            <FormField label="Body" type="textarea" value={form.body} onChange={set("body")} span={2} />
            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Cover image</span>
              <div className="adm-upload-row">
                {form.cover_url ? (
                  <img className="adm-thumb adm-thumb--lg" src={form.cover_url} alt="" />
                ) : (
                  <span className="adm-thumb adm-thumb--lg adm-thumb--empty">No image</span>
                )}
                <input
                  type={isDataCover ? "text" : "url"}
                  placeholder="https://… or upload a file"
                  value={isDataCover ? "Uploaded image" : form.cover_url}
                  disabled={isDataCover}
                  onChange={(e) => set("cover_url")(e.target.value)}
                />
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={onCoverPicked} />
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={uploading}
                  onClick={() => coverRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "↑ Upload"}
                </button>
                {form.cover_url && (
                  <button
                    type="button"
                    className="adm-icon-btn adm-icon-btn--danger"
                    aria-label="Remove cover image"
                    onClick={() => set("cover_url")("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head"><h2>Visibility</h2></header>
          <div className="adm-form-grid">
            <FormField label="Show in the app" type="checkbox" value={form.channels.app} onChange={setChannel("app")} />
            <FormField label="Show on the website" type="checkbox" value={form.channels.website} onChange={setChannel("website")} />
            <FormField
              label="Published"
              type="checkbox"
              value={form.published}
              onChange={set("published")}
            />
          </div>
          <p className="adm-panel__empty">
            Drafts stay hidden everywhere. Published insights appear on the
            channels ticked above — the website's Insights section updates
            instantly.
          </p>
        </section>

        <footer className="adm-form-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/insights">Cancel</Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create insight" : "Save changes"}
          </button>
        </footer>
      </form>
    </>
  );
}
