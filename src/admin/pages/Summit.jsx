import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, uploadImage } from "../api.js";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

// The four card sections on the public page, all backed by SummitItem rows
// distinguished by `kind`. Stats reuse title/subtitle as figure/label, which
// is why each section spells out its own field labels.
const SECTIONS = [
  {
    kind: "stat",
    label: "Key figures",
    hint: "The numbers panel beside “What to Expect”.",
    titleLabel: "Figure",
    titlePlaceholder: "500+",
    subtitleLabel: "Label",
    subtitlePlaceholder: "Global Delegates",
    hasIcon: false,
    hasDescription: false,
  },
  {
    kind: "highlight",
    label: "What to expect",
    hint: "The highlights list.",
    titleLabel: "Title",
    hasIcon: true,
    hasDescription: true,
  },
  {
    kind: "agenda",
    label: "Agenda verticals",
    hint: "The four-column strip of tracks.",
    titleLabel: "Vertical",
    hasIcon: true,
    hasDescription: true,
  },
  {
    kind: "award",
    label: "Awards",
    hint: "Categories in the REIFGO Awards section.",
    titleLabel: "Award",
    hasIcon: false,
    hasDescription: true,
  },
];

// Keys understood by SummitIcon on the public site. Anything else renders as
// no icon, so the list is offered rather than free text.
const ICONS = [
  { value: "", label: "— None —" },
  { value: "users", label: "People" },
  { value: "panel", label: "Panel / discussion" },
  { value: "handshake", label: "Handshake" },
  { value: "medal", label: "Medal / award" },
  { value: "building", label: "Residential building" },
  { value: "office", label: "Office towers" },
  { value: "robot", label: "Technology" },
  { value: "leaf", label: "Sustainability" },
];

const EMPTY_ITEM = { title: "", subtitle: "", description: "", icon: "", display_order: 0 };
const EMPTY_SPEAKER = {
  name: "",
  role: "",
  company: "",
  topic: "",
  photo_url: "",
  is_featured: false,
  display_order: 0,
};

export default function Summit() {
  const [edition, setEdition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const [itemModal, setItemModal] = useState(null); // { kind, values, id? }
  const [speakerModal, setSpeakerModal] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { kind: 'item'|'speaker', row }
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = () =>
    api
      .get("/admin/summit")
      .then(async (list) => {
        // The public page renders whichever edition is current, so that's the
        // one the CMS opens by default.
        const current = list.find((e) => e.is_current) ?? list[0];
        if (!current) {
          setEdition(null);
          setLoading(false);
          return;
        }
        const full = await api.get(`/admin/summit/${current.id}`);
        setEdition(full);
        setDetails({
          name: full.name ?? "",
          eyebrow: full.eyebrow ?? "",
          tagline: full.tagline ?? "",
          year: full.year ?? "",
          city: full.city ?? "",
          venue: full.venue ?? "",
          hero_image_url: full.hero_image_url ?? "",
          prospectus_url: full.prospectus_url ?? "",
          show_on_app: !!full.show_on_app,
          show_on_website: !!full.show_on_website,
          published: !!full.published,
        });
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDetail = (key) => (value) => setDetails((d) => ({ ...d, [key]: value }));

  const saveDetails = async (e) => {
    e.preventDefault();
    if (savingDetails) return;
    if (details.published && !details.show_on_app && !details.show_on_website) {
      toast.error("Published but hidden everywhere — tick the app, the website, or both");
      return;
    }
    setSavingDetails(true);
    try {
      await api.patch(`/admin/summit/${edition.id}`, {
        name: details.name.trim(),
        eyebrow: details.eyebrow.trim() || undefined,
        tagline: details.tagline.trim() || undefined,
        year: details.year === "" ? undefined : Number(details.year),
        city: details.city.trim() || undefined,
        venue: details.venue.trim() || undefined,
        hero_image_url: details.hero_image_url.trim() || undefined,
        prospectus_url: details.prospectus_url.trim() || undefined,
        show_on_app: details.show_on_app,
        show_on_website: details.show_on_website,
        published: details.published,
      });
      toast.success("Summit details saved");
      load();
    } catch (err) {
      toast.error(err.message);
    }
    setSavingDetails(false);
  };

  const onHeroPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setDetail("hero_image_url")(url);
    } catch (err) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const saveItem = async () => {
    if (busy) return;
    if (!itemModal.values.title.trim()) {
      toast.error("Give it a title");
      return;
    }
    setBusy(true);
    const payload = {
      title: itemModal.values.title.trim(),
      subtitle: itemModal.values.subtitle.trim() || undefined,
      description: itemModal.values.description.trim() || undefined,
      icon: itemModal.values.icon || undefined,
      display_order: Number(itemModal.values.display_order) || 0,
    };
    try {
      if (itemModal.id) {
        await api.patch(`/admin/summit/items/${itemModal.id}`, payload);
      } else {
        await api.post(`/admin/summit/${edition.id}/items`, {
          ...payload,
          kind: itemModal.kind,
        });
      }
      toast.success("Saved");
      setItemModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const saveSpeaker = async () => {
    if (busy) return;
    if (!speakerModal.values.name.trim()) {
      toast.error("Give the speaker a name");
      return;
    }
    setBusy(true);
    const v = speakerModal.values;
    const payload = {
      name: v.name.trim(),
      role: v.role.trim() || undefined,
      company: v.company.trim() || undefined,
      topic: v.topic.trim() || undefined,
      photo_url: v.photo_url.trim() || undefined,
      is_featured: v.is_featured,
      display_order: Number(v.display_order) || 0,
    };
    try {
      if (speakerModal.id) {
        await api.patch(`/admin/summit/speakers/${speakerModal.id}`, payload);
      } else {
        await api.post(`/admin/summit/${edition.id}/speakers`, payload);
      }
      toast.success("Saved");
      setSpeakerModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const confirmDelete = async () => {
    const { kind, row } = pendingDelete;
    try {
      await api.del(
        kind === "item" ? `/admin/summit/items/${row.id}` : `/admin/summit/speakers/${row.id}`,
      );
      toast.success("Deleted");
      setPendingDelete(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onSpeakerPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setSpeakerModal((m) => ({ ...m, values: { ...m.values, photo_url: url } }));
    } catch (err) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <>
        <header className="adm-page-head">
          <h1>Forum</h1>
        </header>
        <p className="adm-panel__empty">Loading…</p>
      </>
    );
  }

  if (!edition) {
    return (
      <>
        <header className="adm-page-head">
          <div>
            <h1>Forum</h1>
            <p>The annual summit shown on the website and in the app.</p>
          </div>
        </header>
        <section className="adm-panel">
          <p className="adm-panel__empty">
            No summit edition exists yet. Run the database seed, or create one via the
            API, and it'll appear here.
          </p>
        </section>
      </>
    );
  }

  const itemsOf = (kind) =>
    (edition.items ?? [])
      .filter((i) => i.kind === kind)
      .sort((a, b) => a.display_order - b.display_order);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Forum</h1>
          <p>
            The annual summit. Everything here drives the public Forum page on the
            website and in the app.
          </p>
        </div>
        <Link className="adm-btn adm-btn--ghost" to="/admin/summit/invitations">
          Invitation requests
        </Link>
      </header>

      <form className="adm-form" onSubmit={saveDetails}>
        <section className="adm-panel">
          <header className="adm-panel__head">
            <h2>Event details</h2>
          </header>
          <div className="adm-form-grid">
            <FormField label="Event name" required value={details.name} onChange={setDetail("name")} span={2} />
            <FormField
              label="Eyebrow"
              value={details.eyebrow}
              onChange={setDetail("eyebrow")}
              hint="Small caps line above the headline"
            />
            <FormField label="Tagline" value={details.tagline} onChange={setDetail("tagline")} />
            <FormField label="Year" type="number" value={details.year} onChange={setDetail("year")} />
            <FormField label="City" value={details.city} onChange={setDetail("city")} />
            <FormField
              label="Venue"
              value={details.venue}
              onChange={setDetail("venue")}
              hint="Shown in the hero corner"
            />
            <FormField
              label="Prospectus URL"
              type="url"
              value={details.prospectus_url}
              onChange={setDetail("prospectus_url")}
              hint="Leave blank and the download button is hidden"
            />
            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Hero image</span>
              <div className="adm-upload-row">
                {details.hero_image_url ? (
                  <img className="adm-thumb adm-thumb--lg" src={details.hero_image_url} alt="" />
                ) : (
                  <span className="adm-thumb adm-thumb--lg adm-thumb--empty">No image</span>
                )}
                <input
                  type="url"
                  placeholder="https://… or upload a file"
                  value={details.hero_image_url}
                  onChange={(e) => setDetail("hero_image_url")(e.target.value)}
                />
                <input type="file" accept="image/*" hidden id="summit-hero" onChange={onHeroPicked} />
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={uploading}
                  onClick={() => document.getElementById("summit-hero").click()}
                >
                  {uploading ? "Uploading…" : "↑ Upload"}
                </button>
                {details.hero_image_url && (
                  <button
                    type="button"
                    className="adm-icon-btn adm-icon-btn--danger"
                    aria-label="Remove hero image"
                    onClick={() => setDetail("hero_image_url")("")}
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
            <h2>Visibility</h2>
          </header>
          <div className="adm-form-grid">
            <FormField
              label="Show in the app"
              type="checkbox"
              value={details.show_on_app}
              onChange={setDetail("show_on_app")}
            />
            <FormField
              label="Show on the website"
              type="checkbox"
              value={details.show_on_website}
              onChange={setDetail("show_on_website")}
            />
            <FormField
              label="Published"
              type="checkbox"
              value={details.published}
              onChange={setDetail("published")}
            />
          </div>
          <p className="adm-panel__empty">
            Unpublished, the Forum page shows a “not found” state on whichever surface
            it's hidden from.
          </p>
        </section>

        <footer className="adm-form-actions">
          <button className="adm-btn adm-btn--primary" disabled={savingDetails}>
            {savingDetails ? "Saving…" : "Save details"}
          </button>
        </footer>
      </form>

      {SECTIONS.map((section) => {
        const rows = itemsOf(section.kind);
        return (
          <section className="adm-panel" key={section.kind}>
            <header className="adm-panel__head">
              <h2>{section.label}</h2>
              <button
                className="adm-btn adm-btn--ghost adm-btn--sm"
                onClick={() =>
                  setItemModal({
                    kind: section.kind,
                    values: { ...EMPTY_ITEM, display_order: rows.length },
                  })
                }
              >
                + Add
              </button>
            </header>
            {rows.length === 0 ? (
              <p className="adm-panel__empty">
                Nothing here yet. {section.hint}
              </p>
            ) : (
              <ul className="adm-reply-list">
                {rows.map((row) => (
                  <li className="adm-reply" key={row.id}>
                    <div className="adm-reply__meta">
                      <strong>{row.title}</strong>
                      {row.subtitle && <span>{row.subtitle}</span>}
                      <span>#{row.display_order}</span>
                    </div>
                    {row.description && <p className="adm-reply__body">{row.description}</p>}
                    <div className="adm-reply__actions">
                      <button
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        onClick={() =>
                          setItemModal({
                            kind: section.kind,
                            id: row.id,
                            values: {
                              title: row.title ?? "",
                              subtitle: row.subtitle ?? "",
                              description: row.description ?? "",
                              icon: row.icon ?? "",
                              display_order: row.display_order ?? 0,
                            },
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="adm-btn adm-btn--danger adm-btn--sm"
                        onClick={() => setPendingDelete({ kind: "item", row })}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section className="adm-panel">
        <header className="adm-panel__head">
          <h2>Speakers</h2>
          <button
            className="adm-btn adm-btn--ghost adm-btn--sm"
            onClick={() =>
              setSpeakerModal({
                values: { ...EMPTY_SPEAKER, display_order: (edition.speakers ?? []).length },
              })
            }
          >
            + Add
          </button>
        </header>
        {(edition.speakers ?? []).length === 0 ? (
          <p className="adm-panel__empty">No speakers yet.</p>
        ) : (
          <ul className="adm-reply-list">
            {[...edition.speakers]
              .sort((a, b) => a.display_order - b.display_order)
              .map((s) => (
                <li className="adm-reply" key={s.id}>
                  <div className="adm-reply__meta">
                    <strong>{s.name}</strong>
                    <span>{[s.role, s.company].filter(Boolean).join(", ")}</span>
                    <span>#{s.display_order}</span>
                    {s.is_featured && <span className="adm-badge adm-badge--chan">Featured</span>}
                    {!s.photo_url && <span className="adm-badge adm-badge--pending">No photo</span>}
                  </div>
                  {s.topic && <p className="adm-reply__body">{s.topic}</p>}
                  <div className="adm-reply__actions">
                    <button
                      className="adm-btn adm-btn--ghost adm-btn--sm"
                      onClick={() =>
                        setSpeakerModal({
                          id: s.id,
                          values: {
                            name: s.name ?? "",
                            role: s.role ?? "",
                            company: s.company ?? "",
                            topic: s.topic ?? "",
                            photo_url: s.photo_url ?? "",
                            is_featured: !!s.is_featured,
                            display_order: s.display_order ?? 0,
                          },
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="adm-btn adm-btn--danger adm-btn--sm"
                      onClick={() => setPendingDelete({ kind: "speaker", row: s })}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {itemModal && (
        <Modal
          title={itemModal.id ? "Edit entry" : "New entry"}
          onClose={() => setItemModal(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setItemModal(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--primary" disabled={busy} onClick={saveItem}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          {(() => {
            const cfg = SECTIONS.find((s) => s.kind === itemModal.kind);
            const setV = (k) => (v) =>
              setItemModal((m) => ({ ...m, values: { ...m.values, [k]: v } }));
            return (
              <div className="adm-form-grid">
                <FormField
                  label={cfg.titleLabel}
                  required
                  value={itemModal.values.title}
                  onChange={setV("title")}
                  placeholder={cfg.titlePlaceholder}
                  span={2}
                />
                {cfg.subtitleLabel && (
                  <FormField
                    label={cfg.subtitleLabel}
                    value={itemModal.values.subtitle}
                    onChange={setV("subtitle")}
                    placeholder={cfg.subtitlePlaceholder}
                    span={2}
                  />
                )}
                {cfg.hasIcon && (
                  <FormField
                    label="Icon"
                    type="select"
                    value={itemModal.values.icon}
                    onChange={setV("icon")}
                    options={ICONS}
                  />
                )}
                <FormField
                  label="Display order"
                  type="number"
                  value={itemModal.values.display_order}
                  onChange={setV("display_order")}
                  hint="Lower comes first"
                />
                {cfg.hasDescription && (
                  <FormField
                    label="Description"
                    type="textarea"
                    value={itemModal.values.description}
                    onChange={setV("description")}
                    span={2}
                  />
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {speakerModal && (
        <Modal
          title={speakerModal.id ? "Edit speaker" : "New speaker"}
          onClose={() => setSpeakerModal(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setSpeakerModal(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--primary" disabled={busy} onClick={saveSpeaker}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="adm-form-grid">
            <FormField
              label="Name"
              required
              value={speakerModal.values.name}
              onChange={(v) => setSpeakerModal((m) => ({ ...m, values: { ...m.values, name: v } }))}
              span={2}
            />
            <FormField
              label="Role"
              value={speakerModal.values.role}
              onChange={(v) => setSpeakerModal((m) => ({ ...m, values: { ...m.values, role: v } }))}
              placeholder="Chief Strategist"
            />
            <FormField
              label="Company"
              value={speakerModal.values.company}
              onChange={(v) =>
                setSpeakerModal((m) => ({ ...m, values: { ...m.values, company: v } }))
              }
              placeholder="Global Equity Fund"
            />
            <FormField
              label="Session blurb"
              type="textarea"
              value={speakerModal.values.topic}
              onChange={(v) => setSpeakerModal((m) => ({ ...m, values: { ...m.values, topic: v } }))}
              span={2}
            />
            <FormField
              label="Display order"
              type="number"
              value={speakerModal.values.display_order}
              onChange={(v) =>
                setSpeakerModal((m) => ({ ...m, values: { ...m.values, display_order: v } }))
              }
            />
            <FormField
              label="Featured"
              type="checkbox"
              value={speakerModal.values.is_featured}
              onChange={(v) =>
                setSpeakerModal((m) => ({ ...m, values: { ...m.values, is_featured: v } }))
              }
            />
            <div className="adm-field adm-field--span2">
              <span className="adm-field__label">Photo</span>
              <div className="adm-upload-row">
                {speakerModal.values.photo_url ? (
                  <img className="adm-thumb adm-thumb--lg" src={speakerModal.values.photo_url} alt="" />
                ) : (
                  <span className="adm-thumb adm-thumb--lg adm-thumb--empty">Initials</span>
                )}
                <input
                  type="url"
                  placeholder="https://… or upload"
                  value={speakerModal.values.photo_url}
                  onChange={(e) =>
                    setSpeakerModal((m) => ({
                      ...m,
                      values: { ...m.values, photo_url: e.target.value },
                    }))
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  id="speaker-photo"
                  onChange={onSpeakerPhoto}
                />
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={uploading}
                  onClick={() => document.getElementById("speaker-photo").click()}
                >
                  {uploading ? "Uploading…" : "↑ Upload"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <Modal
          title="Delete?"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="adm-btn adm-btn--danger" onClick={confirmDelete}>
                Delete
              </button>
            </>
          }
        >
          <p>
            “{pendingDelete.row.title ?? pendingDelete.row.name}” will be removed from the
            Forum page. This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
