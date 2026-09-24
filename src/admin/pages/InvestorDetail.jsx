import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, isReifgoTier, maskPhone } from "../api.js";
import FormField from "../components/FormField.jsx";
import Modal from "../components/Modal.jsx";
import Presence from "../components/Presence.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Switch from "../components/Switch.jsx";
import { useToast } from "../components/Toast.jsx";
import { APP_PROPERTY_URL } from "../leadUtils.js";
import { RESIDENCE_NAMES } from "../residence.js";

const GOALS = ["Capital growth", "Rental yield", "Residency"];
const RISKS = ["Conservative", "Balanced", "Aggressive"];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
const fmtSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const DOC_STATUS = {
  pending_review: { label: "Waiting for review", cls: "adm-badge--pending" },
  verified: { label: "Verified", cls: "adm-badge--active" },
  rejected: { label: "Sent back", cls: "adm-badge--closed" },
};

const PROFILE_KEYS = [
  "full_name", "email", "phone", "gender", "nationality", "country", "city", "date_of_birth",
  "street", "building", "unit", "po_box", "area_of_interest", "investment_goal", "risk_tolerance",
];

function toForm(u) {
  const f = {};
  for (const k of PROFILE_KEYS) f[k] = u[k] ?? "";
  f.date_of_birth = u.date_of_birth ? u.date_of_birth.slice(0, 10) : "";
  return f;
}

/**
 * One investor (Syed, Sept 24): profile, investment profile, enquiries,
 * saved listings, events and documents. Customer support edits the profile;
 * only main REIFGO admins open documents, verify them, or change the account.
 */
export default function InvestorDetail() {
  const { id } = useParams();
  const [u, setU] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [sendBack, setSendBack] = useState(null); // { doc, label, reason }
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const toast = useToast();
  const reifgo = isReifgoTier();

  const apply = (row) => {
    setU(row);
    setForm(toForm(row));
  };

  useEffect(() => {
    api
      .get(`/admin/users/${id}`)
      .then(apply)
      .catch((e) => (e.status === 404 ? setMissing(true) : toast.error(e.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (missing) {
    return (
      <section className="adm-panel">
        <p className="adm-panel__empty">
          This investor isn't in your view. <Link to="/admin/users">Back to Investors</Link>
        </p>
      </section>
    );
  }
  if (!u || !form) {
    return <section className="adm-panel"><p className="adm-panel__empty">Loading…</p></section>;
  }

  const { access } = u;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = PROFILE_KEYS.some((k) => (form[k] ?? "") !== (toForm(u)[k] ?? ""));

  const save = async (e) => {
    e.preventDefault();
    if (busy || !dirty) return;
    const original = toForm(u);
    const body = {};
    for (const k of PROFILE_KEYS) {
      if (form[k] === original[k]) continue;
      if (k === "phone" && !access.manage_account) continue;
      body[k] = typeof form[k] === "string" ? form[k].trim() : form[k];
    }
    setBusy(true);
    try {
      apply(await api.patch(`/admin/users/${id}`, body));
      toast.success("Investor details saved");
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const patchAccount = async (body, message) => {
    try {
      apply(await api.patch(`/admin/users/${id}`, body));
      toast.success(message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openDoc = async (doc) => {
    // Opened first so the browser doesn't treat it as a pop-up.
    const tab = window.open("", "_blank");
    try {
      const blob = await api.blob(`/admin/users/${id}/documents/${doc.id}/file`);
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        // Pop-ups blocked: download it instead of leaving the CMS.
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.file_name;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      toast.error(err.message);
    }
  };

  const review = async (doc, decision, reason) => {
    try {
      apply(await api.post(`/admin/users/${id}/documents/${doc.id}/review`, { decision, ...(reason ? { reason } : {}) }));
      toast.success(decision === "approve" ? "Document verified" : "Sent back to the investor");
      setSendBack(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const name = u.full_name || "Name not given";
  const readOnly = !access.edit_profile;
  const countryOptions = RESIDENCE_NAMES.includes(form.country) || !form.country
    ? RESIDENCE_NAMES
    : [form.country, ...RESIDENCE_NAMES];

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to="/admin/users">Investors</Link>
            <span>/</span>
            <span>{name}</span>
          </nav>
          <h1>{name}</h1>
          <p className="adm-investor-meta">
            {u.last_seen_at ? <Presence at={u.last_seen_at} /> : <span>Not active in the app since Sept 24</span>}
            <span>Joined {fmtDate(u.created_at)}</span>
            <span>{[u.city, u.country].filter(Boolean).join(", ") || "Location not given"} · {u.region ?? "Other region"}</span>
            {u.is_verified && <span className="adm-badge adm-badge--active">Verified investor</span>}
            {u.tier === "premium_investor" && <StatusBadge value="premium_investor" />}
            {u.is_suspended && <span className="adm-badge adm-badge--closed">Suspended</span>}
          </p>
        </div>
      </header>

      {u.is_suspended && (
        <p className="adm-note adm-note--danger">This account is suspended: the investor can't sign in to the app.</p>
      )}

      <div className="adm-investor-layout">
        <div className="adm-investor-main">
          <form className="adm-panel" onSubmit={save} noValidate>
            <header className="adm-panel__head">
              <div>
                <h2>Profile</h2>
                <p className="adm-panel__note">
                  {readOnly
                    ? "Read-only for regional admins."
                    : "Changes are saved to the investor's account and show in the app."}
                </p>
              </div>
            </header>
            <fieldset className="adm-form-grid" disabled={readOnly}>
              <FormField label="Full name" value={form.full_name} onChange={set("full_name")} />
              <FormField label="Email" type="email" value={form.email} onChange={set("email")} />
              {access.manage_account ? (
                <FormField
                  label="Mobile (sign-in number)"
                  value={form.phone}
                  onChange={set("phone")}
                  hint="They sign in with this number. Change it only when they've confirmed a new one."
                />
              ) : (
                <label className="adm-field">
                  <span className="adm-field__label">Mobile (sign-in number)</span>
                  <input value={form.phone} readOnly disabled />
                </label>
              )}
              <FormField
                label="Gender"
                type="select"
                value={form.gender}
                onChange={set("gender")}
                options={[{ value: "", label: "Rather not say" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }]}
              />
              <FormField label="Nationality" value={form.nationality} onChange={set("nationality")} />
              <FormField label="Date of birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
              <FormField
                label="Country of residence"
                type="select"
                value={form.country}
                onChange={set("country")}
                options={[{ value: "", label: "Not given" }, ...countryOptions.map((c) => ({ value: c, label: c }))]}
              />
              <FormField label="City" value={form.city} onChange={set("city")} />
              <FormField label="Street" value={form.street} onChange={set("street")} span={2} />
              <FormField label="Building" value={form.building} onChange={set("building")} />
              <FormField label="Unit" value={form.unit} onChange={set("unit")} />
              <FormField label="P.O. box" value={form.po_box} onChange={set("po_box")} />
              {access.open_documents && u.eid_passport && (
                <label className="adm-field">
                  <span className="adm-field__label">Emirates ID / passport no.</span>
                  <input value={u.eid_passport} readOnly disabled />
                </label>
              )}
            </fieldset>

            <header className="adm-panel__head adm-panel__head--sub">
              <h2>Investment profile</h2>
            </header>
            <fieldset className="adm-form-grid" disabled={readOnly}>
              <FormField
                label="Main goal"
                type="select"
                value={form.investment_goal}
                onChange={set("investment_goal")}
                options={[{ value: "", label: "Not given" }, ...GOALS.map((g) => ({ value: g, label: g }))]}
              />
              <FormField
                label="Risk appetite"
                type="select"
                value={form.risk_tolerance}
                onChange={set("risk_tolerance")}
                options={[{ value: "", label: "Not given" }, ...RISKS.map((g) => ({ value: g, label: g }))]}
              />
              <FormField
                label="Markets of interest"
                value={form.area_of_interest}
                onChange={set("area_of_interest")}
                placeholder="UAE, UK"
                span={2}
              />
            </fieldset>

            {!readOnly && (
              <footer className="adm-form-actions adm-form-actions--inset">
                <button type="button" className="adm-btn adm-btn--ghost" disabled={!dirty || busy} onClick={() => setForm(toForm(u))}>
                  Undo changes
                </button>
                <button className="adm-btn adm-btn--primary" disabled={!dirty || busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </footer>
            )}
          </form>

          <section className="adm-panel">
            <header className="adm-panel__head">
              <div>
                <h2>Documents</h2>
                <p className="adm-panel__note">
                  {access.open_documents
                    ? "Uploaded from the app's Document Vault. Opening a document is recorded in the Activity Log."
                    : "Which documents are in. Only REIFGO admins can open them."}
                </p>
              </div>
              <span className="adm-muted">{u.documents.uploaded} of {u.documents.total} uploaded</span>
            </header>
            <ul className="adm-doc-list">
              {u.document_slots.map(({ kind, label, document: doc }) => {
                const st = doc ? DOC_STATUS[doc.status] : null;
                return (
                  <li key={kind} className="adm-doc">
                    <div className="adm-doc__body">
                      <strong>{label}</strong>
                      {doc ? (
                        <span>
                          {doc.file_name} · {fmtSize(doc.size_bytes)} · uploaded {fmtDateTime(doc.uploaded_at)}
                          {doc.status === "rejected" && doc.rejection_reason ? ` · "${doc.rejection_reason}"` : ""}
                        </span>
                      ) : (
                        <span className="adm-muted">Not uploaded</span>
                      )}
                    </div>
                    {st && <span className={`adm-badge ${st.cls}`}>{st.label}</span>}
                    {doc && access.open_documents && (
                      <div className="adm-doc__actions">
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => openDoc(doc)}>
                          Open ↗
                        </button>
                        {doc.status !== "verified" && (
                          <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => review(doc, "approve")}>
                            Verify
                          </button>
                        )}
                        {doc.status !== "rejected" && (
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost adm-btn--sm"
                            onClick={() => setSendBack({ doc, label, reason: "" })}
                          >
                            Send back
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="adm-investor-side">
          {access.manage_account && (
            <section className="adm-panel">
              <header className="adm-panel__head"><h2>Account</h2></header>
              <div className="adm-switch-stack">
                <FormField
                  label="Tier"
                  type="select"
                  value={u.tier}
                  onChange={(v) => patchAccount({ tier: v }, v === "premium_investor" ? "Now a premium investor" : "Now a regular investor")}
                  options={[{ value: "regular", label: "Regular" }, { value: "premium_investor", label: "Premium investor" }]}
                />
                <Switch
                  label="Verified investor"
                  description="Their identity and documents have been checked."
                  checked={u.is_verified}
                  onChange={(v) => patchAccount({ is_verified: v }, v ? "Marked as verified" : "Verified status removed")}
                />
                <Switch
                  label="Suspended"
                  description="Stops them signing in to the app. Their enquiries stay with the sales teams."
                  checked={u.is_suspended}
                  onChange={(v) => (v ? setConfirmSuspend(true) : patchAccount({ is_suspended: false }, "Suspension lifted"))}
                />
              </div>
            </section>
          )}

          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Enquiries</h2>
              <span className="adm-muted">{u.leads.length}</span>
            </header>
            {u.leads.length === 0 ? (
              <p className="adm-panel__empty">No enquiries yet.</p>
            ) : (
              <ul className="adm-side-list">
                {u.leads.map((l) => {
                  const body = (
                    <>
                      <strong>{l.property?.name ?? (l.developer_name ? `${l.developer_name} (developer)` : "General enquiry")}</strong>
                      <span>
                        {[l.developer_name, fmtDate(l.created_at), l.broker?.name && `with ${l.broker.name}`].filter(Boolean).join(" · ")}
                      </span>
                      <StatusBadge value={l.status} />
                    </>
                  );
                  return (
                    <li key={l.id}>
                      {reifgo ? <Link to={`/admin/leads/${l.id}`}>{body}</Link> : <div>{body}</div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Saved listings</h2>
              <span className="adm-muted">{u.saved_properties.length}</span>
            </header>
            {u.saved_properties.length === 0 ? (
              <p className="adm-panel__empty">Nothing saved.</p>
            ) : (
              <ul className="adm-side-list">
                {u.saved_properties.map((s) => (
                  <li key={s.property.id}>
                    <a href={APP_PROPERTY_URL(s.property.id)} target="_blank" rel="noopener noreferrer">
                      <strong>{s.property.name}</strong>
                      <span>{[s.property.location, `saved ${fmtDate(s.saved_at)}`].filter(Boolean).join(" · ")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="adm-panel">
            <header className="adm-panel__head">
              <h2>Events</h2>
              <span className="adm-muted">{u.registered_events.length}</span>
            </header>
            {u.registered_events.length === 0 ? (
              <p className="adm-panel__empty">No registrations.</p>
            ) : (
              <ul className="adm-side-list">
                {u.registered_events.map((r) => (
                  <li key={r.event.id}>
                    <div>
                      <strong>{r.event.title}</strong>
                      <span>{fmtDate(r.event.date)} · registered {fmtDate(r.registered_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {sendBack && (
        <Modal
          title={`Send back the ${sendBack.label.toLowerCase()}`}
          onClose={() => setSendBack(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setSendBack(null)}>Cancel</button>
              <button
                className="adm-btn adm-btn--primary"
                disabled={!sendBack.reason.trim()}
                onClick={() => review(sendBack.doc, "reject", sendBack.reason.trim())}
              >
                Send back
              </button>
            </>
          }
        >
          <FormField
            label="What needs fixing?"
            type="textarea"
            value={sendBack.reason}
            onChange={(v) => setSendBack((x) => ({ ...x, reason: v }))}
            placeholder="The photo is blurry. Please upload a clear scan of both sides."
            hint="The investor sees this in the app next to the document."
          />
        </Modal>
      )}

      {confirmSuspend && (
        <Modal
          title={`Suspend ${name}?`}
          onClose={() => setConfirmSuspend(false)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setConfirmSuspend(false)}>Cancel</button>
              <button
                className="adm-btn adm-btn--danger"
                onClick={async () => {
                  setConfirmSuspend(false);
                  await patchAccount({ is_suspended: true }, "Account suspended");
                }}
              >
                Suspend account
              </button>
            </>
          }
        >
          <p>
            They'll be signed out of the app and can't sign back in with {maskPhone(u.phone)} until the suspension is
            lifted here. Their enquiries stay with the sales teams.
          </p>
        </Modal>
      )}
    </>
  );
}
