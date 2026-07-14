import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "contacted", label: "Contacted" },
  { key: "closed", label: "Closed" },
];

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

export default function Leads() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("all");
  const toast = useToast();

  useEffect(() => {
    api.get("/admin/leads").then(setRows).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (!rows) return [];
    return tab === "all" ? rows : rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const setStatus = async (lead, status) => {
    try {
      const updated = await api.patch(`/admin/leads/${lead.id}`, { status });
      setRows((list) => list.map((r) => (r.id === lead.id ? updated : r)));
      toast.success("Lead updated");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Leads</h1>
          <p>Interest, callback and document requests from app users.</p>
        </div>
      </header>

      <div className="adm-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`adm-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {rows && (
              <span className="adm-tab__count">
                {t.key === "all" ? rows.length : rows.filter((r) => r.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        rows={visible}
        searchKeys={["user.full_name", "user.phone", "user.email", "property.name"]}
        searchPlaceholder="Search leads…"
        emptyText={rows === null ? "Loading…" : "No leads in this view."}
        columns={[
          {
            key: "user",
            label: "User",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>{r.user?.full_name || "Unnamed user"}</strong>
                <span>{r.user?.phone}</span>
              </div>
            ),
          },
          {
            key: "property",
            label: "Regarding",
            render: (r) =>
              r.property?.name ?? (
                <div className="adm-cell-stack">
                  <strong>{r.interest ?? "General enquiry"}</strong>
                  {r.message && <span>“{r.message.slice(0, 60)}{r.message.length > 60 ? "…" : ""}”</span>}
                </div>
              ),
          },
          { key: "lead_type", label: "Request", render: (r) => <StatusBadge value={r.lead_type} />, width: 140 },
          {
            key: "source",
            label: "Source",
            width: 100,
            render: (r) => (
              <span className={`adm-badge adm-badge--${r.source === "website" ? "chan" : "contacted"}`}>
                {r.source === "website" ? "Website" : "App"}
              </span>
            ),
          },
          { key: "created_at", label: "Received", render: (r) => fmtDate(r.created_at), width: 120 },
          {
            key: "status",
            label: "Status",
            width: 150,
            render: (r) => (
              <select
                className="adm-inline-select"
                value={r.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setStatus(r, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
            ),
          },
        ]}
      />
    </>
  );
}
