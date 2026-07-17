import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getSession } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";
import { ESCALATION, initials, timeAgo } from "../leadUtils.js";

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "overdue", label: "Overdue", match: (r) => !!r.escalation },
  { key: "new", label: "New", match: (r) => r.status === "new" },
  { key: "assigned", label: "Assigned", match: (r) => r.status === "assigned" },
  { key: "contacted", label: "Contacted", match: (r) => r.status === "contacted" },
  { key: "qualified", label: "Qualified", match: (r) => r.status === "qualified" },
  { key: "closed", label: "Closed", match: (r) => r.status?.startsWith("closed") },
];

export default function Leads() {
  const [rows, setRows] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [tab, setTab] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const isBroker = session?.role === "broker";

  useEffect(() => {
    api.get("/admin/leads").then(setRows).catch((e) => toast.error(e.message));
    if (!isBroker) {
      api.get("/admin/brokers").then(setBrokers).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const visible = useMemo(() => {
    if (!rows) return [];
    return rows.filter(
      (r) =>
        activeTab.match(r) &&
        (brokerFilter === "all" || r.assigned_broker_id === brokerFilter),
    );
  }, [rows, activeTab, brokerFilter]);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>{isBroker ? "My Leads" : "Leads"}</h1>
          <p>
            {isBroker
              ? "Enquiries assigned to you. Respond within 24h to keep them on track."
              : "Every enquiry on your listings, with assignment, status and response tracking."}
          </p>
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
            {rows && <span className="adm-tab__count">{rows.filter(t.match).length}</span>}
          </button>
        ))}
      </div>

      <DataTable
        rows={visible}
        searchKeys={["user.full_name", "user.phone", "user.email", "property.name", "broker.name"]}
        searchPlaceholder="Search leads…"
        emptyText={rows === null ? "Loading…" : "No leads in this view."}
        onRowClick={(row) => navigate(`/admin/leads/${row.id}`)}
        toolbar={
          !isBroker && brokers.length > 0 ? (
            <select
              className="adm-inline-select"
              value={brokerFilter}
              onChange={(e) => setBrokerFilter(e.target.value)}
            >
              <option value="all">All brokers</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : null
        }
        columns={[
          {
            key: "user",
            label: "Investor",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>{r.user?.full_name || "Unnamed"}</strong>
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
                  <span>{r.source === "website" ? "Website form" : "App"}</span>
                </div>
              ),
          },
          {
            key: "broker",
            label: "Broker",
            width: 150,
            render: (r) =>
              r.broker ? (
                <span className="adm-broker-name">
                  <span className="adm-avatar">{initials(r.broker.name)}</span>
                  {r.broker.name}
                </span>
              ) : (
                <span className="use">Unassigned</span>
              ),
          },
          {
            key: "sla",
            label: "SLA",
            width: 130,
            render: (r) => {
              if (r.escalation) {
                const e = ESCALATION[r.escalation];
                return <span className={`adm-badge adm-badge--esc-${e.tone}`}>{e.label}</span>;
              }
              if (r.response_hours != null) {
                return <span className="use">Replied in {r.response_hours}h</span>;
              }
              return <span className="use">—</span>;
            },
          },
          { key: "created_at", label: "Received", render: (r) => timeAgo(r.created_at), width: 110 },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} />, width: 120 },
        ]}
      />
    </>
  );
}
