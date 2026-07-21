import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { TIERS, fmtDate, optionalId, str } from "../contentUtils.js";

const EMPTY = {
  title: "",
  slug: "",
  category_id: "",
  excerpt: "",
  body: "",
  author_name: "REIFGO Team",
  tier: "secondary",
  is_featured: false,
  is_pinned: false,
  is_locked: false,
  display_order: 0,
  show_on_app: true,
  show_on_website: true,
  published: false,
};

export default function ForumForm() {
  const { id } = useParams();
  const isNew = !id;
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [originalSlug, setOriginalSlug] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api
      .get("/admin/categories?scope=forum")
      .then(setCategories)
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadThread = () =>
    api
      .get(`/admin/forum/threads/${id}`)
      .then((t) => {
        setOriginalSlug(t.slug ?? "");
        setPosts(t.posts ?? []);
        setForm({
          title: t.title ?? "",
          slug: t.slug ?? "",
          category_id: t.category_id ?? "",
          excerpt: t.excerpt ?? "",
          body: t.body ?? "",
          author_name: t.author_name ?? "",
          tier: t.tier ?? "secondary",
          is_featured: !!t.is_featured,
          is_pinned: !!t.is_pinned,
          is_locked: !!t.is_locked,
          display_order: t.display_order ?? 0,
          show_on_app: !!t.show_on_app,
          show_on_website: !!t.show_on_website,
          published: !!t.published,
        });
      })
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    if (isNew) return;
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim()) {
      toast.error("Give the thread a title");
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
      category_id: optionalId(form.category_id),
      author_name: str(form.author_name),
      tier: form.tier,
      is_featured: form.is_featured,
      is_pinned: form.is_pinned,
      is_locked: form.is_locked,
      display_order: Number(form.display_order) || 0,
      show_on_app: form.show_on_app,
      show_on_website: form.show_on_website,
      published: form.published,
    };
    if (form.slug.trim() && form.slug.trim() !== originalSlug) {
      payload.slug = form.slug.trim();
    }

    try {
      if (isNew) {
        await api.post("/admin/forum/threads", payload);
        toast.success("Thread created");
      } else {
        await api.patch(`/admin/forum/threads/${id}`, payload);
        toast.success("Thread saved");
      }
      navigate("/admin/forum");
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  // Hiding keeps the reply in the database but removes it from both surfaces,
  // so moderation is reversible. Deleting is not.
  const toggleHidden = async (post) => {
    try {
      await api.patch(`/admin/forum/posts/${post.id}`, { is_hidden: !post.is_hidden });
      toast.success(post.is_hidden ? "Reply restored" : "Reply hidden");
      loadThread();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const confirmDeletePost = async () => {
    try {
      await api.del(`/admin/forum/posts/${pendingDelete.id}`);
      toast.success("Reply deleted");
      setPendingDelete(null);
      loadThread();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const categoryOptions = [
    { value: "", label: "— No category —" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to="/admin/forum">Forum</Link>
            <span>/</span>
            <span>{isNew ? "New" : form.title || "Edit"}</span>
          </nav>
          <h1>{isNew ? "New thread" : form.title || "Edit thread"}</h1>
        </div>
      </header>

      <form className="adm-form" onSubmit={submit}>
        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Thread</h2>
          </header>
          <div className="adm-form-grid">
            <FormField label="Title" required value={form.title} onChange={set("title")} span={2} />
            <FormField
              label="Category"
              type="select"
              value={form.category_id}
              onChange={set("category_id")}
              options={categoryOptions}
              hint={categories.length === 0 ? "No categories yet — add some first" : undefined}
            />
            <FormField label="Started by" value={form.author_name} onChange={set("author_name")} />
            <FormField
              label="Excerpt"
              type="textarea"
              value={form.excerpt}
              onChange={set("excerpt")}
              span={2}
              hint="Short summary shown on thread cards"
            />
            <FormField
              label="Opening post"
              type="textarea"
              value={form.body}
              onChange={set("body")}
              span={2}
            />
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
              hint="Primary threads lead the page"
            />
            <FormField
              label="Display order"
              type="number"
              value={form.display_order}
              onChange={set("display_order")}
              hint="Lower numbers come first within a tier"
            />
            <FormField
              label="Pin to the top"
              type="checkbox"
              value={form.is_pinned}
              onChange={set("is_pinned")}
            />
            <FormField
              label="Feature this thread"
              type="checkbox"
              value={form.is_featured}
              onChange={set("is_featured")}
            />
            <FormField
              label="Lock (no new replies)"
              type="checkbox"
              value={form.is_locked}
              onChange={set("is_locked")}
            />
          </div>
          <p className="adm-panel__empty">
            Pinned threads sit above everything else, ahead of primary tier.
          </p>
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
                hint="Changing this breaks any existing link to the thread"
              />
            )}
          </div>
        </section>

        <footer className="adm-form-actions">
          <Link className="adm-btn adm-btn--ghost" to="/admin/forum">
            Cancel
          </Link>
          <button className="adm-btn adm-btn--primary" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create thread" : "Save changes"}
          </button>
        </footer>
      </form>

      {!isNew && (
        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Replies ({posts.length})</h2>
          </header>
          {posts.length === 0 ? (
            <p className="adm-panel__empty">No replies yet.</p>
          ) : (
            <ul className="adm-reply-list">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className={`adm-reply${p.is_hidden ? " adm-reply--hidden" : ""}`}
                >
                  <div className="adm-reply__meta">
                    <strong>{p.author_name ?? p.author_user?.full_name ?? "Unknown"}</strong>
                    <span>{fmtDate(p.created_at)}</span>
                    {p.is_hidden && <span className="adm-badge adm-badge--pending">Hidden</span>}
                  </div>
                  <p className="adm-reply__body">{p.body}</p>
                  <div className="adm-reply__actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--sm"
                      onClick={() => toggleHidden(p)}
                    >
                      {p.is_hidden ? "Restore" : "Hide"}
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn--danger adm-btn--sm"
                      onClick={() => setPendingDelete(p)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {pendingDelete && (
        <Modal
          title="Delete reply?"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--danger" onClick={confirmDeletePost}>
                Delete
              </button>
            </>
          }
        >
          <p>
            This reply will be permanently removed. If you only want it off the
            site, use <strong>Hide</strong> instead — that's reversible.
          </p>
        </Modal>
      )}
    </>
  );
}
