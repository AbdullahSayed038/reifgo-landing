import { useEffect, useState } from "react";
import { api, isReifgoTier } from "../api.js";
import FormField from "./FormField.jsx";
import { useToast } from "./Toast.jsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMEZONES = [
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "Asia/Singapore",
];
const DEFAULT_HOURS = { timezone: "Asia/Dubai", days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" };

/**
 * How a developer's new leads reach their agents (Syed, Sept 15).
 * Manual: a Sales Manager hands each one out. Auto: leads rotate between the
 * agents in the rotation; if the agent doesn't mark it contacted within the
 * window (working hours only) it moves to the next one.
 */
export default function DistributionPanel({ developerId, onChanged }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const reifgo = isReifgoTier();

  const load = () => {
    if (reifgo && !developerId) return;
    const qs = reifgo ? `?developer_id=${encodeURIComponent(developerId)}` : "";
    api
      .get(`/admin/leads/distribution${qs}`)
      .then((d) => {
        setData(d);
        setDraft({
          lead_distribution: d.lead_distribution,
          rotation_minutes: d.rotation_minutes,
          useHours: !!d.working_hours,
          hours: d.working_hours ?? DEFAULT_HOURS,
        });
      })
      .catch((e) => toast.error(e.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId]);

  if (reifgo && !developerId) {
    return (
      <section className="adm-panel">
        <header className="adm-panel__head"><h2>Lead distribution</h2></header>
        <p className="adm-panel__empty">Pick a developer above to see how their leads are handed out.</p>
      </section>
    );
  }
  if (!data || !draft) return null;

  const editable = data.can_edit;
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const setHours = (k) => (v) => setDraft((d) => ({ ...d, hours: { ...d.hours, [k]: v } }));
  const toggleDay = (i) =>
    setDraft((d) => ({
      ...d,
      hours: {
        ...d.hours,
        days: d.hours.days.includes(i) ? d.hours.days.filter((x) => x !== i) : [...d.hours.days, i].sort(),
      },
    }));

  const save = async () => {
    if (busy) return;
    const minutes = Number(draft.rotation_minutes);
    if (draft.lead_distribution === "auto") {
      if (!Number.isFinite(minutes) || minutes < 5) return toast.error("Give agents at least 5 minutes");
      if (draft.useHours && !draft.hours.days.length) return toast.error("Pick at least one working day");
      if (draft.useHours && draft.hours.start >= draft.hours.end) return toast.error("Working hours must end after they start");
    }
    setBusy(true);
    try {
      const next = await api.patch("/admin/leads/distribution", {
        ...(reifgo ? { developer_id: developerId } : {}),
        lead_distribution: draft.lead_distribution,
        ...(draft.lead_distribution === "auto"
          ? { rotation_minutes: minutes, working_hours: draft.useHours ? draft.hours : null }
          : {}),
      });
      setData(next);
      toast.success(draft.lead_distribution === "auto" ? "Auto rotation is on" : "Leads are handed out manually");
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const toggleAgent = async (agent) => {
    try {
      await api.patch(`/admin/brokers/${agent.id}`, { in_rotation: !agent.in_rotation });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const inRotation = data.agents.filter((a) => a.in_rotation && a.is_active);
  const hoursText = (m) => (m % 60 === 0 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m} minutes`);

  return (
    <section className="adm-panel">
      <header className="adm-panel__head">
        <h2>Lead distribution{reifgo ? ` · ${data.name}` : ""}</h2>
      </header>

      <div className="adm-seg" role="radiogroup" aria-label="Lead distribution">
        {[
          ["manual", "Manual"],
          ["auto", "Auto rotation"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={draft.lead_distribution === value}
            className={draft.lead_distribution === value ? "is-active" : ""}
            disabled={!editable}
            onClick={() => set("lead_distribution")(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="adm-tl__meta" style={{ margin: "10px 0 14px" }}>
        {draft.lead_distribution === "manual"
          ? "A Sales Manager picks who gets each new lead."
          : `Each new lead goes to the next agent in turn. If they haven't marked it contacted within ${hoursText(Number(draft.rotation_minutes) || 0)}${draft.useHours ? " of working time" : ""}, it moves to the next agent.`}
      </p>

      {draft.lead_distribution === "auto" && (
        <div className="adm-form-grid">
          <FormField
            label="Time to pick up a lead (minutes)"
            type="number"
            value={draft.rotation_minutes}
            onChange={set("rotation_minutes")}
            hint="e.g. 30, 60, 120"
          />
          <FormField
            label="Only count working hours"
            type="checkbox"
            value={draft.useHours}
            onChange={set("useHours")}
          />
          {draft.useHours && (
            <>
              <FormField
                label="Timezone"
                type="select"
                value={draft.hours.timezone}
                onChange={setHours("timezone")}
                options={(TIMEZONES.includes(draft.hours.timezone) ? TIMEZONES : [draft.hours.timezone, ...TIMEZONES]).map((z) => ({ value: z, label: z.replace("_", " ") }))}
              />
              <div className="adm-field">
                <span className="adm-field__label">Working days</span>
                <div className="adm-days">
                  {DAYS.map((d, i) => (
                    <button
                      type="button"
                      key={d}
                      className={`adm-chip-btn${draft.hours.days.includes(i) ? " is-active" : ""}`}
                      disabled={!editable}
                      onClick={() => toggleDay(i)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <FormField label="Start" type="time" value={draft.hours.start} onChange={setHours("start")} />
              <FormField label="End" type="time" value={draft.hours.end} onChange={setHours("end")} />
            </>
          )}

          <div className="adm-field adm-field--span2">
            <span className="adm-field__label">
              In the rotation ({inRotation.length} of {data.agents.length})
            </span>
            {data.agents.length === 0 ? (
              <p className="adm-panel__empty">No approved team members yet.</p>
            ) : (
              <div className="adm-rotation-list">
                {data.agents.map((a) => (
                  <label key={a.id}>
                    <input
                      type="checkbox"
                      checked={a.in_rotation}
                      disabled={!editable || !a.is_active}
                      onChange={() => toggleAgent(a)}
                    />
                    <span>
                      {a.name} {a.position && <small>· {a.position}</small>} {!a.is_active && <small>· deactivated</small>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {inRotation.length === 0 && (
              <span className="adm-field__hint">Nobody is in the rotation, so new leads will wait unassigned.</span>
            )}
          </div>
        </div>
      )}

      {editable ? (
        <footer className="adm-form-actions" style={{ marginTop: 16 }}>
          <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save distribution"}
          </button>
        </footer>
      ) : (
        <p className="adm-tl__meta" style={{ marginTop: 12 }}>Only accounts that can hand out leads can change this.</p>
      )}
    </section>
  );
}
