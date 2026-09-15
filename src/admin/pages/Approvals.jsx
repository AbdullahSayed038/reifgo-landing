import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, PERMISSIONS, permissionTitle } from "../api.js";
import Modal from "../components/Modal.jsx";
import FormField from "../components/FormField.jsx";
import IconPicker from "../components/IconPicker.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";
import { APP_PROPERTY_URL, timeAgo } from "../leadUtils.js";

// Readable names for the parts of a listing an edit touches.
const FIELD_LABEL = {
  name: "Name",
  location: "Location",
  asset_class: "Asset class",
  payment_plan: "Payment plan",
  property_type: "Property type",
  ownership_type: "Ownership",
  total_area: "Area",
  completion_date: "Completion date",
  min_entry_price: "Starting price",
  sustainability_rating: "Sustainability",
  overview: "Overview",
  status: "Status",
  channels: "Where it shows",
  media: "Photos",
  construction_progress: "Construction progress",
  progress_verified_at: "RERA check date",
  handover: "Handover",
  permits: "Permits",
  unit_types: "Unit types",
  amenities: "Amenities",
  nearby_places: "Nearby places",
  faqs: "FAQs",
  roi: "ROI figures",
};

/**
 * What REIFGO has to sign off: team accounts developers created, listings and
 * edits to live listings, and logo changes (Syed, Sept 15).
 */
export default function Approvals() {
  const [queue, setQueue] = useState(null);
  const [busy, setBusy] = useState(null);
  const [declining, setDeclining] = useState(null); // { kind, id, name }
  const [reason, setReason] = useState("");
  const [addingAmenity, setAddingAmenity] = useState(null); // { id, label, group_name, icon }
  const toast = useToast();

  // Keeps the sidebar badge in step with the queue on this page.
  const show = (q) => {
    setQueue(q);
    window.dispatchEvent(new CustomEvent("reifgo:approvals", { detail: q.total ?? 0 }));
  };

  const load = () => api.get("/admin/approvals").then(show).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (kind, id, decision, why, extra = {}) => {
    setBusy(`${kind}:${id}`);
    try {
      const next = await api.post(`/admin/approvals/${kind}/${id}`, { decision, ...(why ? { reason: why } : {}), ...extra });
      show(next);
      toast.success(decision === "approve" ? "Approved" : "Declined");
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(null);
  };

  const confirmDecline = async () => {
    const d = declining;
    setDeclining(null);
    await decide(d.kind, d.id, "reject", reason.trim());
    setReason("");
  };

  const actions = (kind, id, name) => (
    <div className="adm-review__actions">
      <button
        className="adm-btn adm-btn--ghost adm-btn--sm"
        disabled={busy === `${kind}:${id}`}
        onClick={() => setDeclining({ kind, id, name })}
      >
        Decline
      </button>
      <button
        className="adm-btn adm-btn--primary adm-btn--sm"
        disabled={busy === `${kind}:${id}`}
        onClick={() => decide(kind, id, "approve")}
      >
        Approve
      </button>
    </div>
  );

  const empty = (text) => <p className="adm-panel__empty">{text}</p>;

  const confirmAmenity = async () => {
    const a = addingAmenity;
    if (!a.label.trim()) return toast.error("Give the amenity a name");
    if (!a.icon) return toast.error("Pick an icon");
    setAddingAmenity(null);
    await decide("amenities", a.id, "approve", undefined, { label: a.label.trim(), icon: a.icon, group_name: a.group_name });
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Approvals</h1>
          <p>New team accounts, listings, listing edits, amenity requests and logo changes from developers wait here until you deal with them.</p>
        </div>
      </header>

      {queue === null ? (
        <p className="adm-panel__empty">Loading…</p>
      ) : (
        <>
          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Team accounts {queue.accounts.length > 0 && <span className="adm-tab__count">{queue.accounts.length}</span>}</h2>
            </header>
            {queue.accounts.length === 0
              ? empty("No accounts waiting.")
              : queue.accounts.map((a) => (
                  <div className="adm-review" key={a.id}>
                    <div className="adm-review__main">
                      <strong>{a.name} · {permissionTitle(a.permissions)}</strong>
                      <span>{a.email}{a.position ? ` · ${a.position}` : ""}</span>
                      <span>
                        {a.developer_name} · added by {a.created_by ?? "the developer"} {timeAgo(a.created_at)}
                      </span>
                      {a.permissions.length > 0 && (
                        <span>
                          Can: {PERMISSIONS.filter((p) => a.permissions.includes(p.key)).map((p) => p.label.toLowerCase()).join(", ")}
                        </span>
                      )}
                    </div>
                    {actions("accounts", a.id, a.name)}
                  </div>
                ))}
          </section>

          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Listings {queue.listings.length > 0 && <span className="adm-tab__count">{queue.listings.length}</span>}</h2>
            </header>
            {queue.listings.length === 0
              ? empty("No listings waiting.")
              : queue.listings.map((l) => (
                  <div className="adm-review" key={l.id}>
                    {l.media?.[0]?.url ? (
                      <img className="adm-review__img" src={l.media[0].url} alt="" loading="lazy" />
                    ) : (
                      <span className="adm-review__img" />
                    )}
                    <div className="adm-review__main">
                      <strong>
                        {l.name}{" "}
                        <span className={`adm-badge ${l.kind === "new" ? "adm-badge--pending" : "adm-badge--assigned"}`}>
                          {l.kind === "new" ? "New listing" : "Edit to live listing"}
                        </span>
                      </strong>
                      <span>{[l.developer_name, l.location].filter(Boolean).join(" · ")}</span>
                      <span>
                        Sent by {l.submitted_by ?? "the developer"} {l.submitted_at ? timeAgo(l.submitted_at) : ""}
                        {l.kind === "edit" && l.changed.length > 0 && ` · changes: ${l.changed.map((k) => FIELD_LABEL[k] ?? k).join(", ")}`}
                      </span>
                      <span>
                        <Link to={`/admin/properties/${l.id}`}>Open in CMS</Link>
                        {l.kind === "edit" && (
                          <>
                            {" · "}
                            <a href={APP_PROPERTY_URL(l.id)} target="_blank" rel="noopener noreferrer">Live version ↗</a>
                          </>
                        )}
                      </span>
                    </div>
                    {actions("listings", l.id, l.name)}
                  </div>
                ))}
          </section>

          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Amenity requests {queue.amenities?.length > 0 && <span className="adm-tab__count">{queue.amenities.length}</span>}</h2>
            </header>
            {!queue.amenities?.length
              ? empty("No amenity requests.")
              : queue.amenities.map((r) => (
                  <div className="adm-review" key={r.id}>
                    <div className="adm-review__main">
                      <strong>{r.label}</strong>
                      <span>
                        {[r.developer_name, r.property_name].filter(Boolean).join(" · ")}
                        {r.group_name ? ` · ${r.group_name}` : ""}
                      </span>
                      <span>Asked by {r.requested_by ?? "the developer"} {timeAgo(r.created_at)}. Not in the amenity list yet.</span>
                    </div>
                    <div className="adm-review__actions">
                      <button
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        disabled={busy === `amenities:${r.id}`}
                        onClick={() => decide("amenities", r.id, "reject")}
                      >
                        Dismiss
                      </button>
                      <button
                        className="adm-btn adm-btn--primary adm-btn--sm"
                        disabled={busy === `amenities:${r.id}`}
                        onClick={() => setAddingAmenity({ id: r.id, label: r.label, group_name: r.group_name || "Building Amenities", icon: "" })}
                      >
                        Add to list…
                      </button>
                    </div>
                  </div>
                ))}
          </section>

          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Logo changes {queue.logos.length > 0 && <span className="adm-tab__count">{queue.logos.length}</span>}</h2>
            </header>
            {queue.logos.length === 0
              ? empty("No logo requests.")
              : queue.logos.map((d) => (
                  <div className="adm-review" key={d.id}>
                    <div className="adm-review__main">
                      <strong>{d.name}</strong>
                      <span>Requested {d.logo_requested_at ? fmtDate(d.logo_requested_at) : ""}</span>
                      <div className="adm-logo-compare" style={{ marginTop: 6 }}>
                        {d.logo_url ? <img src={d.logo_url} alt="Current logo" /> : <span className="adm-tl__meta">No logo yet</span>}
                        <span aria-hidden="true">→</span>
                        <img src={d.pending_logo_url} alt="Requested logo" />
                      </div>
                    </div>
                    {actions("logos", d.id, d.name)}
                  </div>
                ))}
          </section>
        </>
      )}

      {addingAmenity && (
        <Modal
          title="Add amenity to the list"
          onClose={() => setAddingAmenity(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setAddingAmenity(null)}>Cancel</button>
              <button className="adm-btn adm-btn--primary" onClick={confirmAmenity}>Add amenity</button>
            </>
          }
        >
          <p className="adm-tl__meta" style={{ marginBottom: 12 }}>
            It's added to the list for every developer, and listings that already use it get the icon.
          </p>
          <div className="adm-form-grid">
            <FormField label="Name" value={addingAmenity.label} onChange={(v) => setAddingAmenity((a) => ({ ...a, label: v }))} hint="Fix the spelling here if needed." />
            <FormField
              label="Group"
              type="select"
              value={addingAmenity.group_name}
              onChange={(v) => setAddingAmenity((a) => ({ ...a, group_name: v }))}
              options={[
                { value: "Building Amenities", label: "Building Amenities" },
                { value: "Unit Facilities", label: "Unit Facilities" },
              ]}
            />
            <IconPicker value={addingAmenity.icon} onChange={(v) => setAddingAmenity((a) => ({ ...a, icon: v }))} />
          </div>
        </Modal>
      )}

      {declining && (
        <Modal
          title={`Decline ${declining.name}?`}
          onClose={() => setDeclining(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setDeclining(null)}>Cancel</button>
              <button className="adm-btn adm-btn--danger" onClick={confirmDecline}>Decline</button>
            </>
          }
        >
          <label className="adm-field">
            <span className="adm-field__label">Reason (optional, the developer sees it)</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </Modal>
      )}
    </>
  );
}
