import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getSession, isReifgoTier } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAutoRefresh } from "../useAutoRefresh.js";
import { ESCALATION, initials, timeAgo } from "../leadUtils.js";

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "overdue", label: "Needs Attention", match: (r) => !!r.escalation },
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
  // Syed, September round: filter by developer, property and a date range.
  const [developerFilter, setDeveloperFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const isBroker = session?.role === "broker";

  // Silent on refresh: a background poll shouldn't pop a toast if the network
  // hiccups, only the initial load should surface an error.
  const load = useCallback(
    (surfaceErrors = false) => {
      api
        .get("/admin/leads")
        .then(setRows)
        .catch((e) => surfaceErrors && toast.error(e.message));
      if (!isBroker) api.get("/admin/brokers").then(setBrokers).catch(() => {});
    },
    [isBroker, toast],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New enquiries appear on their own within ~20s — no manual refresh.
  useAutoRefresh(load);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const isAdmin = isReifgoTier(session);

  // Options come from the leads themselves, so a developer or property with no
  // enquiries never appears as a choice that returns an empty table.
  const developerOptions = useMemo(() => {
    const seen = new Map();
    for (const r of rows ?? []) {
      if (r.developer_id && !seen.has(r.developer_id)) seen.set(r.developer_id, r.developer_name);
    }
    return [...seen].sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? ""));
  }, [rows]);

  const propertyOptions = useMemo(() => {
    const seen = new Map();
    for (const r of rows ?? []) {
      if (!r.property_id || seen.has(r.property_id)) continue;
      // Narrowed to the chosen developer, so the list stays short and relevant.
      if (developerFilter !== "all" && r.developer_id !== developerFilter) continue;
      seen.set(r.property_id, r.property?.name ?? "Untitled property");
    }
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, developerFilter]);

  // Everything except the status tab. The tab counts are taken from this, so
  // "Needs Attention 3" means three within the current filters, not overall.
  const filtered = useMemo(() => {
    if (!rows) return [];
    // Inclusive of the whole "to" day, in the viewer's own timezone.
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return rows.filter((r) => {
      const created = new Date(r.created_at);
      return (
        (brokerFilter === "all" || r.assigned_broker_id === brokerFilter) &&
        (developerFilter === "all" || r.developer_id === developerFilter) &&
        (propertyFilter === "all" || r.property_id === propertyFilter) &&
        (!from || created >= from) &&
        (!to || created <= to)
      );
    });
  }, [rows, brokerFilter, developerFilter, propertyFilter, dateFrom, dateTo]);

  const visible = useMemo(() => filtered.filter(activeTab.match), [filtered, activeTab]);

  const filtersActive =
    brokerFilter !== "all" ||
    developerFilter !== "all" ||
    propertyFilter !== "all" ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setBrokerFilter("all");
    setDeveloperFilter("all");
    setPropertyFilter("all");
    setDateFrom("");
    setDateTo("");
  };

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
            {rows && <span className="adm-tab__count">{filtered.filter(t.match).length}</span>}
          </button>
        ))}
      </div>

      <DataTable
        rows={visible}
        searchKeys={["user.full_name", "user.phone", "user.email", "property.name", "broker.name", "developer_name"]}
        searchPlaceholder="Search leads…"
        emptyText={rows === null ? "Loading…" : "No leads in this view."}
        // Website enquiries have no property and so no developer; they band
        // together under REIFGO rather than being filed under someone else.
        groupBy={(r) => r.developer_name}
        onRowClick={(row) => navigate(`/admin/leads/${row.id}`)}
        toolbar={
          <div className="adm-filters">
            {isAdmin && developerOptions.length > 1 && (
              <select
                className="adm-inline-select"
                value={developerFilter}
                aria-label="Filter by developer"
                onChange={(e) => {
                  setDeveloperFilter(e.target.value);
                  // A property from the previous developer would silently empty the table.
                  setPropertyFilter("all");
                }}
              >
                <option value="all">All developers</option>
                {developerOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}

            {propertyOptions.length > 0 && (
              <select
                className="adm-inline-select"
                value={propertyFilter}
                aria-label="Filter by property"
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <option value="all">All properties</option>
                {propertyOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}

            {!isBroker && brokers.length > 0 && (
              <select
                className="adm-inline-select"
                value={brokerFilter}
                aria-label="Filter by Sales Agent"
                onChange={(e) => setBrokerFilter(e.target.value)}
              >
                <option value="all">All Sales Agents</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            <span className="adm-daterange">
              <input
                type="date"
                className="adm-inline-select"
                value={dateFrom}
                max={dateTo || undefined}
                aria-label="Received from"
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span aria-hidden="true">–</span>
              <input
                type="date"
                className="adm-inline-select"
                value={dateTo}
                min={dateFrom || undefined}
                aria-label="Received to"
                onChange={(e) => setDateTo(e.target.value)}
              />
            </span>

            {filtersActive && (
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
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
              r.property?.name ? (
                // The property alone did not say whose lead this was, so the
                // developer sits under it rather than in a column of its own.
                <div className="adm-cell-stack">
                  <strong>{r.property.name}</strong>
                  <span>{r.developer_name ?? "Unassigned developer"}</span>
                </div>
              ) : (
                // No property: a developer-page enquiry (the developer is set)
                // or a general enquiry for the REIFGO team.
                <div className="adm-cell-stack">
                  <strong>{r.developer_name ?? r.interest ?? "General enquiry"}</strong>
                  <span>
                    {r.developer_name
                      ? r.interest ?? "Developer enquiry"
                      : r.source === "website" ? "Website form" : "App"}
                  </span>
                </div>
              ),
          },
          {
            key: "broker",
            label: "Sales Agent",
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
            label: "Response Time",
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
