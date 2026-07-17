import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getSession } from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  ESCALATION,
  LIFECYCLE,
  STEP_LABEL,
  fmtDateTime,
  fmtHours,
  initials,
  stepIndex,
  timeAgo,
} from "../leadUtils.js";

const TL_ICON = { creation: "＋", assignment: "⇄", status: "✓", note: "✎" };

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const session = getSession();
  const isBroker = session?.role === "broker";
  const canAssign = !isBroker && !!lead?.developer_id;

  useEffect(() => {
    api.get(`/admin/leads/${id}`).then(setLead).catch((e) => toast.error(e.message));
    if (!isBroker) api.get("/admin/brokers").then(setBrokers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (body, okMsg) => {
    setBusy(true);
    try {
      const updated = await api.patch(`/admin/leads/${id}`, body);
      setLead(updated);
      if (okMsg) toast.success(okMsg);
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const assign = (broker_id) =>
    patch({ assigned_broker_id: broker_id || null }, broker_id ? "Lead assigned" : "Lead unassigned");

  const setStatus = (status, msg) => patch({ status }, msg);

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      const updated = await api.post(`/admin/leads/${id}/activity`, { note: note.trim() });
      setLead(updated);
      setNote("");
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  if (!lead) {
    return (
      <>
        <nav className="adm-crumbs"><Link to="/admin/leads">Leads</Link><span>/</span><span>…</span></nav>
        <p className="adm-panel__empty">Loading…</p>
      </>
    );
  }

  const idx = stepIndex(lead.status);
  const esc = lead.escalation ? ESCALATION[lead.escalation] : null;
  const brokerOptions = brokers.filter((b) => b.developer_id === lead.developer_id);

  // Which status actions to offer given the current state.
  const actions = [];
  if (lead.status === "assigned") actions.push(["contacted", "Mark contacted", "primary"]);
  if (lead.status === "contacted") actions.push(["qualified", "Mark qualified", "primary"]);
  if (lead.status === "contacted" || lead.status === "qualified") {
    actions.push(["closed_won", "Close · won", "primary"]);
    actions.push(["closed_lost", "Close · lost", "danger"]);
  }
  if (lead.status?.startsWith("closed")) actions.push(["contacted", "Reopen", "ghost"]);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <nav className="adm-crumbs">
            <Link to="/admin/leads">Leads</Link>
            <span>/</span>
            <span>{lead.user?.full_name || "Enquiry"}</span>
          </nav>
          <h1>{lead.user?.full_name || "Website enquiry"}</h1>
          <p>{lead.property?.name ?? lead.interest ?? "General enquiry"} · received {timeAgo(lead.created_at)}</p>
        </div>
        <StatusBadge value={lead.status} />
      </header>

      {esc && (
        <div className={`adm-esc-banner adm-esc-banner--${esc.tone}`}>
          ⚠ {esc.label} — no broker response within {lead.escalation === "reifgo" ? "48h" : "24h"} of assignment.
        </div>
      )}

      <div className="adm-detail-grid">
        {/* Main column */}
        <div>
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Lifecycle</h2></header>
            <div className="adm-stepper">
              {LIFECYCLE.map((step, i) => {
                let cls = "adm-step";
                if (i < 4 && i <= idx) cls += " is-done";
                if (i === 4 && idx === 4) {
                  cls += lead.status === "closed_won" ? " is-won" : " is-lost";
                } else if (i === 4 && idx >= 4) {
                  cls += " is-done";
                }
                return (
                  <div key={step} className={cls}>
                    {i === 4 && lead.status === "closed_won"
                      ? "Won"
                      : i === 4 && lead.status === "closed_lost"
                        ? "Lost"
                        : STEP_LABEL[step]}
                  </div>
                );
              })}
            </div>

            {actions.length > 0 ? (
              <div className="adm-status-actions" style={{ marginTop: 18 }}>
                {actions.map(([status, label, tone]) => (
                  <button
                    key={label}
                    className={`adm-btn adm-btn--${tone}`}
                    disabled={busy}
                    onClick={() => setStatus(status, `Marked ${label.replace(/^Mark /, "").toLowerCase()}`)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : lead.status === "new" ? (
              <p className="adm-panel__empty" style={{ marginTop: 14 }}>
                {canAssign ? "Assign a broker to start the pipeline." : "Waiting to be assigned."}
              </p>
            ) : null}
          </section>

          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Activity</h2></header>

            <form className="adm-note-form" onSubmit={addNote}>
              <textarea
                placeholder="Log a call, note next steps…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="adm-btn adm-btn--primary" disabled={busy || !note.trim()}>
                  Add note
                </button>
              </div>
            </form>

            <div className="adm-timeline">
              {lead.activity.map((a) => (
                <div className="adm-tl" key={a.id}>
                  <span className={`adm-tl__dot adm-tl__dot--${a.type}`} aria-hidden="true">
                    {TL_ICON[a.type] ?? "•"}
                  </span>
                  <div className="adm-tl__body">
                    <p>{a.note}</p>
                    <div className="adm-tl__meta">{a.actor} · {timeAgo(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Side column */}
        <div>
          <section className="adm-panel">
            <header className="adm-panel__head"><h2>Contact</h2></header>
            <dl className="adm-kv">
              <dt>Phone</dt><dd>{lead.user?.phone ?? "—"}</dd>
              <dt>Email</dt><dd>{lead.user?.email ?? "—"}</dd>
              <dt>Request</dt><dd><StatusBadge value={lead.lead_type} /></dd>
              <dt>Source</dt><dd>{lead.source === "website" ? "Website form" : "App"}</dd>
              {lead.property?.name && (<><dt>Property</dt><dd>{lead.property.name}</dd></>)}
              <dt>Received</dt><dd>{fmtDateTime(lead.created_at)}</dd>
              {lead.response_hours != null && (<><dt>First response</dt><dd>{fmtHours(lead.response_hours)}</dd></>)}
            </dl>
            {lead.message && (
              <p className="adm-tl__meta" style={{ marginTop: 12 }}>“{lead.message}”</p>
            )}
          </section>

          {lead.developer_id && (
            <section className="adm-panel">
              <header className="adm-panel__head"><h2>Assignment</h2></header>
              {canAssign ? (
                <div className="adm-assign">
                  <select
                    value={lead.assigned_broker_id ?? ""}
                    disabled={busy}
                    onChange={(e) => assign(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {brokerOptions.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              ) : lead.broker ? (
                <span className="adm-assigned-chip">
                  <span className="adm-avatar">{initials(lead.broker.name)}</span>
                  {lead.broker.name}
                </span>
              ) : (
                <p className="adm-panel__empty">Not yet assigned.</p>
              )}
              {lead.assigned_at && (
                <p className="adm-tl__meta" style={{ marginTop: 10 }}>
                  Assigned {timeAgo(lead.assigned_at)}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
