import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getSession, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";
import { TIERS, optionalId, str } from "../contentUtils.js";

const EMPTY = {
  title: "",
  slug: "",
  category_id: "",
  excerpt: "",
  body: "",
  cover_url: "",
  author_name: "REIFGO Research",
  tier: "secondary",
  is_featured: false,
  display_order: 0,
  show_on_app: true,
  show_on_website: true,
  published: false,
};

export default function InsightForm() {
  const { id } = useParams();
  const isNew = !id;
  const session = getSession();
  const isDeveloper = session?.role === "developer";
  const [form, setForm] = useState(() =>
    isDeveloper ? { ...EMPTY, author_name: session.name } : EMPTY,
  );
  const [categories, setCategories] = useState([]);
  // Only shown when editing: a published article's URL is already out there.
  const [originalSlug, setOriginalSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api
      .get("/admin/categories?scope=insight")
      .then(setCategories)
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/insights/${id}`)
      .then((i) => {
        setOriginalSlug(i.slug ?? "");
        setForm({
          title: i.title ?? "",
          slug: i.slug ?? "",
          category_id: i.category_id ?? "",
          excerpt: i.excerpt ?? "",
          body: i.body ?? "",
          cover_url: i.cover_url ?? "",
          author_name: i.author_name ?? "",
          tier: i.tier ?? "secondary",
          is_featured: !!i.is_featured,
          display_order: i.display_order ?? 0,
          show_on_app: !!i.show_on_app,
          show_on_website: !!i.show_on_website,
          published: !!i.published,
        });
      })
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

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
    if (form.published && !form.show_on_app && !form.show_on_website) {
      toast.error("Published but hidden everywhere — tick the app, the website, or both");
      return;
    }
    setBusy(true);

    const payload = {
      title: form.title.trim(),
      excerpt: str(form.excerpt),
      body: str(form.body),
      cover_url: str(form.cover_url),
      category_id: optionalId(form.category_id),
      author_name: str(form.author_name),
      tier: form.tier,
      is_featured: form.is_featured,
      display_order: Number(form.display_order) || 0,
      show_on_app: form.show_on_app,
      show_on_website: form.show_on_website,
      published: form.published,
    };
    // Send the slug only when the admin actually changed it — the API keeps the
    // existing one otherwise, so retitling never breaks a published URL.
    if (form.slug.trim() && form.slug.trim() !== originalSlug) {
      payload.slug = form.slug.trim();
    }

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
  const categoryOptions = [
    { value: "", label: "— No category —" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

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
          <header className="adm-panel__head">
            <h2>Content</h2>
          </header>
          <div className="adm-form-grid">
            <FormField label="Title" required value={form.title} onChange={set("title")} span={2} />
            <FormField
              label="Category"
              type="select"
              value={form.category_id}
              onChange={set("category_id")}
              options={categoryOptions}
              hint={
                categories.length === 0 ? "No categories yet — add some first" : undefined
              }
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
            <FormField
              label="Body"
              type="textarea"
              value={form.body}
              onChange={set("body")}
              span={2}
            />
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
          <header className="adm-panel__head">
            <h2>Placement</h2>
          </header>
          <div className="adm-form-grid">
            <FormField
              label="Tier"
              type="select"
              value={form.tier}
              onChange={set("tier")}
              options={TIERS}
              hint="Primary articles lead the page"
            />
            <FormField
              label="Display order"
              type="number"
              value={form.display_order}
              onChange={set("display_order")}
              hint="Lower numbers come first within a tier"
            />
            <FormField
              label="Feature this article"
              type="checkbox"
              value={form.is_featured}
              onChange={set("is_featured")}
            />
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Visibility</h2>
          </header>
          <div className="adm-form-grid">
            <FormField
              label="Show in the app"
              type="checkbox"
              value={form.show_on_app}
              onChange={set("show_on_app")}
            />
            <FormField
              label="Show on the website"
              type="checkbox"
              value={form.show_on_website}
              onChange={set("show_on_website")}
            />
            <FormField
              label="Published"
              type="checkbox"
              value={form.published}
              onChange={set("published")}
            />
            {!isNew && (
              <FormField
                label="URL slug"
                value={form.slug}
                onChange={set("slug")}
                span={2}
                hint="Changing this breaks any existing link to the article"
              />
            )}
          </div>
          <p className="adm-panel__empty">
            Drafts stay hidden on both surfaces. A published article appears only
            where it's ticked above — so you can run it on the website and hold it
            back from the app, or the reverse.
          </p>
        </section>

        <footer className="adm-form-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/insights">
            Cancel
          </Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create insight" : "Save changes"}
          </button>
        </footer>
      </form>
    </>
  );
}
