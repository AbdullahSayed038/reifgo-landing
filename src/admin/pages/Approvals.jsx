import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, PERMISSIONS, permissionTitle } from "../api.js";
import FormField from "../components/FormField.jsx";
import IconPicker, { IconPreview } from "../components/IconPicker.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate } from "../contentUtils.js";
import { useCurrency } from "../currency.jsx";
import { APP_PROPERTY_URL, timeAgo } from "../leadUtils.js";

const SECTIONS = [
  { key: "accounts", label: "Team accounts" },
  { key: "listings", label: "Listings" },
  { key: "amenities", label: "Amenity requests" },
  { key: "logos", label: "Logo changes" },
];

// The listing fields a reviewer sees, in page order, with how to show each.
const LISTING_FIELDS = [
  ["name", "Name"],
  ["status", "Status"],
  ["location", "Location"],
  ["asset_class", "Asset class"],
  ["property_type", "Property type"],
  ["ownership_type", "Ownership"],
  ["payment_plan", "Payment plan"],
  ["min_entry_price", "Starting price"],
  ["total_area", "Total area (sq ft)"],
  ["completion_date", "Completion date"],
  ["handover", "Handover"],
  ["construction_progress", "Construction progress"],
  ["progress_verified_at", "RERA check date"],
  ["permits", "Permits"],
  ["sustainability_rating", "Sustainability rating"],
  ["overview", "Overview"],
  ["media", "Photos"],
  ["roi", "ROI figures"],
  ["unit_types", "Unit types"],
  ["amenities", "Amenities"],
  ["nearby_places", "Nearby places"],
  ["faqs", "FAQs"],
];

const STATUS_LABEL = { active: "Active", coming_soon: "Coming soon", sold_out: "Sold out" };

/** A comparable, order-sensitive fingerprint of a field, ignoring ids. */
function fingerprint(key, v) {
  if (v == null || v === "") return "";
  if (key === "completion_date" || key === "progress_verified_at") return String(v).slice(0, 10);
  if (Array.isArray(v)) {
    return JSON.stringify(
      v.map((row) => {
        if (row == null || typeof row !== "object") return row;
        const { id, property_id, display_order, unit_type_id, ...rest } = row;
        return Object.fromEntries(Object.entries(rest).filter(([, x]) => x !== null && x !== "" && x !== undefined).sort());
      }),
    );
  }
  if (typeof v === "object") {
    const { id, property_id, ...rest } = v;
    return JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([, x]) => x != null && x !== "").sort()));
  }
  return String(v);
}

function FieldValue({ field, value, fmtMoney }) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return <span className="adm-muted">—</span>;
  }
  switch (field) {
    case "status":
      return STATUS_LABEL[value] ?? value;
    case "min_entry_price":
      return fmtMoney(Number(value));
    case "completion_date":
    case "progress_verified_at":
      return fmtDate(value);
    case "construction_progress":
      return `${value}%`;
    case "permits":
      return value.join(", ");
    case "media":
      return (
        <span className="adm-diff-thumbs">
          {value.map((m, i) => (
            <img key={i} src={m.url} alt="" loading="lazy" />
          ))}
        </span>
      );
    case "roi":
      return [
        value.annual_return != null && `${value.annual_return}% annual return`,
        value.rental_yield != null && `${value.rental_yield}% rental yield`,
        value.capital_appreciation != null && `${value.capital_appreciation}% appreciation`,
        value.exit_horizon,
      ].filter(Boolean).join(" · ") || "—";
    case "unit_types":
      return (
        <ul className="adm-diff-list">
          {value.map((u, i) => (
            <li key={i}>
              {u.name}
              {(u.min_area || u.max_area) && ` · ${u.min_area ?? "?"}–${u.max_area ?? "?"} sq ft`}
              {u.from_price != null && ` · from ${fmtMoney(Number(u.from_price))}`}
            </li>
          ))}
        </ul>
      );
    case "amenities":
      return (
        <span className="adm-diff-chips">
          {value.map((a, i) => (
            <span key={i} className="adm-diff-chip">
              <IconPreview name={a.icon} /> {a.label}
            </span>
          ))}
        </span>
      );
    case "nearby_places":
      return (
        <ul className="adm-diff-list">
          {value.map((n, i) => (
            <li key={i}>{n.name} · {n.distance_km} km{n.travel_minutes != null ? ` · ${n.travel_minutes} min ${n.travel_mode ?? ""}` : ""}</li>
          ))}
        </ul>
      );
    case "faqs":
      return (
        <ul className="adm-diff-list">
          {value.map((f, i) => (
            <li key={i}><strong>{f.question}</strong><br />{f.answer}</li>
          ))}
        </ul>
      );
    default:
      return <span style={{ whiteSpace: "pre-line" }}>{String(value)}</span>;
  }
}

/**
 * What REIFGO has to sign off (Syed): team accounts developers created,
 * listings and edits to live listings, amenities that aren't in the list, and
 * logo changes. Split into sections, grouped by developer, and every item can
 * be opened in full — with an edit's changes highlighted — before deciding.
 */
export default function Approvals() {
  const [queue, setQueue] = useState(null);
  const [section, setSection] = useState("all");
  const [developer, setDeveloper] = useState("all");
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null); // { kind, item, detail? }
  const [declineReason, setDeclineReason] = useState(null); // string while the decline box is open
  const [amenityDraft, setAmenityDraft] = useState(null);
  const toast = useToast();
  const { fmtMoney } = useCurrency();

  // Keeps the sidebar badge in step with the queue on this page.
  const show = (q) => {
    setQueue(q);
    window.dispatchEvent(new CustomEvent("reifgo:approvals", { detail: q.total ?? 0 }));
  };

  useEffect(() => {
    api.get("/admin/approvals").then(show).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const devOf = (kind, item) =>
    kind === "logos" ? { id: item.id, name: item.name } : { id: item.developer?.id ?? item.developer_id ?? "reifgo", name: item.developer_name ?? "REIFGO" };

  // Every developer with something waiting, for the filter.
  const developers = useMemo(() => {
    const map = new Map();
    for (const s of SECTIONS) for (const item of queue?.[s.key] ?? []) {
      const d = devOf(s.key, item);
      map.set(d.id, { ...d, count: (map.get(d.id)?.count ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [queue]);

  const itemsFor = (key) =>
    (queue?.[key] ?? []).filter((item) => developer === "all" || devOf(key, item).id === developer);

  // Developer first (Syed): one panel per developer holding everything they
  // have waiting, split by kind. The kind tabs only narrow what's shown.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of SECTIONS) {
      if (section !== "all" && section !== s.key) continue;
      for (const item of itemsFor(s.key)) {
        const d = devOf(s.key, item);
        if (!map.has(d.id)) map.set(d.id, { id: d.id, name: d.name, count: 0, kinds: new Map() });
        const group = map.get(d.id);
        if (!group.kinds.has(s.key)) group.kinds.set(s.key, []);
        group.kinds.get(s.key).push(item);
        group.count++;
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, section, developer]);

  const shownTotal = SECTIONS.reduce((n, s) => n + itemsFor(s.key).length, 0);

  const open = async (kind, item) => {
    setDeclineReason(null);
    setAmenityDraft(kind === "amenities" ? { label: item.label, group_name: item.group_name || "Building Amenities", icon: "" } : null);
    setViewing({ kind, item, detail: null });
    if (kind === "listings") {
      try {
        const detail = await api.get(`/admin/properties/${item.id}`);
        setViewing((v) => (v && v.item.id === item.id ? { ...v, detail } : v));
      } catch (e) {
        toast.error(e.message);
      }
    }
  };

  const decide = async (decision) => {
    const { kind, item } = viewing;
    if (decision === "approve" && kind === "amenities") {
      if (!amenityDraft.label.trim()) return toast.error("Give the amenity a name");
      if (!amenityDraft.icon) return toast.error("Pick an icon");
    }
    setBusy(true);
    try {
      const body = {
        decision,
        ...(decision === "reject" && declineReason?.trim() ? { reason: declineReason.trim() } : {}),
        ...(decision === "approve" && kind === "amenities"
          ? { label: amenityDraft.label.trim(), icon: amenityDraft.icon, group_name: amenityDraft.group_name }
          : {}),
      };
      show(await api.post(`/admin/approvals/${kind}/${item.id}`, body));
      toast.success(
        decision === "approve"
          ? kind === "amenities" ? "Added to the amenity list" : "Approved"
          : kind === "amenities" ? "Dismissed" : "Declined",
      );
      setViewing(null);
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const summary = (kind, item) => {
    switch (kind) {
      case "accounts":
        return {
          title: `${item.name} · ${permissionTitle(item.permissions)}`,
          lines: [item.email, `Added by ${item.created_by ?? "the developer"} ${timeAgo(item.created_at)}`],
        };
      case "listings":
        return {
          title: item.name,
          badge: item.kind === "new" ? ["pending", "New listing"] : ["assigned", "Edit to live listing"],
          lines: [
            item.location,
            `Sent by ${item.submitted_by ?? "the developer"} ${item.submitted_at ? timeAgo(item.submitted_at) : ""}`,
          ],
          img: item.media?.[0]?.url,
        };
      case "amenities":
        return {
          title: item.label,
          lines: [[item.property_name, item.group_name].filter(Boolean).join(" · "), `Asked by ${item.requested_by ?? "the developer"} ${timeAgo(item.created_at)}`],
        };
      default:
        return { title: "New logo", lines: [`Requested ${item.logo_requested_at ? fmtDate(item.logo_requested_at) : ""}`], logo: item.pending_logo_url };
    }
  };

  const total = queue?.total ?? 0;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Approvals</h1>
          <p>Everything developers have sent for REIFGO to check. Open an item to see it in full before you approve it.</p>
        </div>
      </header>

      {queue === null ? (
        <p className="adm-panel__empty">Loading…</p>
      ) : (
        <>
          <div className="adm-tabs">
            <button className={`adm-tab${section === "all" ? " is-active" : ""}`} onClick={() => setSection("all")}>
              All
              <span className="adm-tab__count">{shownTotal}</span>
            </button>
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                className={`adm-tab${section === s.key ? " is-active" : ""}`}
                onClick={() => setSection(s.key)}
              >
                {s.label}
                <span className="adm-tab__count">{itemsFor(s.key).length}</span>
              </button>
            ))}
          </div>

          <div className="adm-filters" style={{ margin: "0 0 14px" }}>
            <select
              className="adm-inline-select"
              value={developer}
              aria-label="Filter by developer"
              onChange={(e) => setDeveloper(e.target.value)}
            >
              <option value="all">All developers ({total})</option>
              {developers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.count})</option>
              ))}
            </select>
          </div>

          {grouped.length === 0 ? (
            <section className="adm-panel">
              <p className="adm-panel__empty">Nothing waiting here.</p>
            </section>
          ) : (
            grouped.map((group) => (
              <section className="adm-panel" key={group.id}>
                <header className="adm-panel__head">
                  <h2>{group.name} <span className="adm-tab__count">{group.count}</span></h2>
                </header>
                {SECTIONS.filter((k) => group.kinds.has(k.key)).map((k) => (
                <div className="adm-approval-kind" key={k.key}>
                {section === "all" && (
                  <h3 className="adm-approval-kind__title">{k.label} <span>{group.kinds.get(k.key).length}</span></h3>
                )}
                {group.kinds.get(k.key).map((item) => {
                  const kind = k.key;
                  const s = summary(kind, item);
                  return (
                    <div className="adm-review adm-review--link" key={item.id} onClick={() => open(kind, item)}>
                      {s.img ? (
                        <img className="adm-review__img" src={s.img} alt="" loading="lazy" />
                      ) : kind === "listings" ? (
                        <span className="adm-review__img" />
                      ) : null}
                      {s.logo && <img className="adm-review__img" src={s.logo} alt="" style={{ objectFit: "contain", background: "#fff" }} />}
                      <div className="adm-review__main">
                        <strong>
                          {s.title}{" "}
                          {s.badge && <span className={`adm-badge adm-badge--${s.badge[0]}`}>{s.badge[1]}</span>}
                        </strong>
                        {s.lines.filter(Boolean).map((l, i) => <span key={i}>{l}</span>)}
                      </div>
                      <div className="adm-review__actions">
                        <button className="adm-btn adm-btn--primary adm-btn--sm" onClick={(e) => { e.stopPropagation(); open(kind, item); }}>
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
                ))}
              </section>
            ))
          )}
        </>
      )}

      {viewing && (
        <Modal
          title={
            viewing.kind === "accounts" ? `Team account · ${viewing.item.name}`
              : viewing.kind === "listings" ? `${viewing.item.kind === "new" ? "New listing" : "Edit"} · ${viewing.item.name}`
                : viewing.kind === "amenities" ? `Amenity request · ${viewing.item.label}`
                  : `Logo change · ${viewing.item.name}`
          }
          onClose={() => setViewing(null)}
          footer={
            declineReason !== null ? (
              <>
                <button className="adm-btn adm-btn--ghost" onClick={() => setDeclineReason(null)}>Back</button>
                <button className="adm-btn adm-btn--danger" disabled={busy} onClick={() => decide("reject")}>
                  {viewing.kind === "amenities" ? "Dismiss" : "Decline"}
                </button>
              </>
            ) : (
              <>
                <button className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => (viewing.kind === "amenities" ? decide("reject") : setDeclineReason(""))}>
                  {viewing.kind === "amenities" ? "Dismiss" : "Decline…"}
                </button>
                <button className="adm-btn adm-btn--primary" disabled={busy || (viewing.kind === "listings" && !viewing.detail)} onClick={() => decide("approve")}>
                  {busy ? "Saving…" : viewing.kind === "amenities" ? "Add to list" : "Approve"}
                </button>
              </>
            )
          }
        >
          <div className="adm-approval-view">
            <p className="adm-tl__meta" style={{ marginBottom: 12 }}>
              {devOf(viewing.kind, viewing.item).name}
            </p>

            {viewing.kind === "accounts" && (
              <dl className="adm-kv adm-kv--left">
                <dt>Name</dt><dd>{viewing.item.name}</dd>
                <dt>Email</dt><dd>{viewing.item.email}</dd>
                <dt>Phone</dt><dd>{viewing.item.phone || "—"}</dd>
                <dt>Position</dt><dd>{viewing.item.position || "—"}</dd>
                <dt>Access</dt>
                <dd>
                  {permissionTitle(viewing.item.permissions)}
                  <ul className="adm-diff-list">
                    <li>Work the leads assigned to them</li>
                    {PERMISSIONS.filter((p) => viewing.item.permissions.includes(p.key)).map((p) => <li key={p.key}>{p.label}</li>)}
                  </ul>
                </dd>
                <dt>Added by</dt><dd>{viewing.item.created_by ?? "the developer"} · {fmtDate(viewing.item.created_at)}</dd>
              </dl>
            )}

            {viewing.kind === "listings" && (
              !viewing.detail ? (
                <p className="adm-panel__empty">Loading the listing…</p>
              ) : viewing.item.kind === "new" ? (
                <table className="adm-diff">
                  <tbody>
                    {LISTING_FIELDS.map(([key, label]) => (
                      <tr key={key}>
                        <th>{label}</th>
                        <td><FieldValue field={key} value={viewing.detail[key]} fmtMoney={fmtMoney} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                (() => {
                  const live = viewing.detail;
                  const proposed = live.pending_changes ?? {};
                  const rows = LISTING_FIELDS.map(([key, label]) => {
                    const touched = key in proposed;
                    const changed = touched && fingerprint(key, proposed[key]) !== fingerprint(key, live[key]);
                    return { key, label, changed, current: live[key], next: touched ? proposed[key] : live[key] };
                  });
                  const count = rows.filter((r) => r.changed).length;
                  return (
                    <>
                      <p className="adm-note adm-note--warn" style={{ marginBottom: 12 }}>
                        {count === 0
                          ? "Nothing actually differs from the live listing."
                          : `${count} change${count === 1 ? "" : "s"}, highlighted below. The app keeps showing the current version until you approve.`}
                      </p>
                      <table className="adm-diff">
                        <thead>
                          <tr><th /><th>Current (live)</th><th>Proposed</th></tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.key} className={r.changed ? "is-changed" : ""}>
                              <th>{r.label}{r.changed && <span className="adm-diff-flag">Changed</span>}</th>
                              <td><FieldValue field={r.key} value={r.current} fmtMoney={fmtMoney} /></td>
                              <td><FieldValue field={r.key} value={r.next} fmtMoney={fmtMoney} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  );
                })()
              )
            )}
            {viewing.kind === "listings" && (
              <p className="adm-tl__meta" style={{ marginTop: 12 }}>
                <Link to={`/admin/properties/${viewing.item.id}`}>Open in the editor</Link>
                {viewing.item.kind === "edit" && (
                  <> · <a href={APP_PROPERTY_URL(viewing.item.id)} target="_blank" rel="noopener noreferrer">See the live page ↗</a></>
                )}
              </p>
            )}

            {viewing.kind === "amenities" && amenityDraft && (
              <>
                <p className="adm-tl__meta" style={{ marginBottom: 12 }}>
                  {viewing.item.property_name ? `On ${viewing.item.property_name}. ` : ""}
                  Adding it puts it in the list for every developer, and listings that already use it get the icon.
                </p>
                <div className="adm-form-grid">
                  <FormField label="Name" value={amenityDraft.label} onChange={(v) => setAmenityDraft((a) => ({ ...a, label: v }))} hint="Fix the spelling here if needed." />
                  <FormField
                    label="Group"
                    type="select"
                    value={amenityDraft.group_name}
                    onChange={(v) => setAmenityDraft((a) => ({ ...a, group_name: v }))}
                    options={[
                      { value: "Building Amenities", label: "Building Amenities" },
                      { value: "Unit Facilities", label: "Unit Facilities" },
                    ]}
                  />
                  <IconPicker value={amenityDraft.icon} onChange={(v) => setAmenityDraft((a) => ({ ...a, icon: v }))} />
                </div>
              </>
            )}

            {viewing.kind === "logos" && (
              <div className="adm-logo-compare adm-logo-compare--lg">
                <figure>
                  {viewing.item.logo_url ? <img src={viewing.item.logo_url} alt="Current logo" /> : <span className="adm-muted">No logo yet</span>}
                  <figcaption>Current</figcaption>
                </figure>
                <span aria-hidden="true">→</span>
                <figure className="is-changed">
                  <img src={viewing.item.pending_logo_url} alt="Requested logo" />
                  <figcaption>Requested</figcaption>
                </figure>
              </div>
            )}

            {declineReason !== null && (
              <label className="adm-field" style={{ marginTop: 16 }}>
                <span className="adm-field__label">Reason (optional, the developer sees it)</span>
                <textarea rows={3} autoFocus value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
              </label>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
