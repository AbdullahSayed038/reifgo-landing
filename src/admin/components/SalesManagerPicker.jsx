import { useState } from "react";
import { api, can } from "../api.js";
import { useToast } from "./Toast.jsx";

/**
 * The developer's Sales Manager (Syed, Sept 22). Anyone approved who can hand
 * out leads can be picked; the first one is assigned automatically.
 */
export default function SalesManagerPicker({ developer, team, onChanged }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const candidates = (team ?? []).filter(
    (b) => b.is_active && (b.approval_status ?? "approved") === "approved" && b.permissions?.includes("assign_leads"),
  );
  const current = developer?.sales_manager;
  const editable = can("manage_team");

  const change = async (value) => {
    setBusy(true);
    try {
      const saved = await api.patch(`/admin/developers/${developer.id}`, { sales_manager_id: value || null });
      toast.success(value ? "Sales Manager updated" : "Sales Manager cleared");
      onChanged?.(saved);
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  return (
    <section className="adm-panel">
      <header className="adm-panel__head">
        <div>
          <h2>Sales Manager</h2>
          <p className="adm-panel__note">
            Oversees this developer's leads and team. The first approved Sales Manager is set automatically.
          </p>
        </div>
      </header>
      {editable ? (
        <div className="adm-filters">
          <select
            className="adm-inline-select"
            value={current?.id ?? ""}
            disabled={busy}
            aria-label="Sales Manager"
            onChange={(e) => change(e.target.value)}
          >
            <option value="">Not set</option>
            {candidates.map((b) => (
              <option key={b.id} value={b.id}>{b.name} · {b.email}</option>
            ))}
          </select>
          {candidates.length === 0 && (
            <span className="adm-tl__meta">
              Nobody can take this yet. Add a team member with the Sales Manager access, and once they're approved they'll be set here.
            </span>
          )}
        </div>
      ) : (
        <p>{current ? `${current.name} · ${current.email}` : "Not set yet."}</p>
      )}
    </section>
  );
}
