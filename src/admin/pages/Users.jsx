import { useEffect, useState } from "react";
import { api } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

export default function Users() {
  const [rows, setRows] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get("/admin/users").then(setRows).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Users</h1>
          <p>People registered in the REIFGO app. Read-only.</p>
        </div>
      </header>

      <DataTable
        rows={rows ?? []}
        searchKeys={["full_name", "phone", "email", "city", "country"]}
        searchPlaceholder="Search users…"
        emptyText={rows === null ? "Loading…" : "No users yet."}
        onRowClick={(row) => setExpanded(expanded === row.id ? null : row.id)}
        columns={[
          {
            key: "full_name",
            label: "Name",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>{r.full_name || "Unnamed user"}</strong>
                <span>{r.email || "no email"}</span>
              </div>
            ),
          },
          { key: "phone", label: "Phone" },
          { key: "city", label: "City", render: (r) => r.city ?? "—" },
          { key: "tier", label: "Tier", render: (r) => <StatusBadge value={r.tier} />, width: 110 },
          { key: "leads", label: "Leads", render: (r) => r._count?.leads ?? 0, width: 70 },
          {
            key: "events",
            label: "Events",
            width: 220,
            render: (r) =>
              expanded === r.id ? (
                <ul className="adm-mini-list">
                  {r.registered_events.length === 0 && <li>No registrations</li>}
                  {r.registered_events.map((re) => (
                    <li key={re.event.id}>
                      {re.event.title} · {fmtDate(re.event.date)}
                    </li>
                  ))}
                </ul>
              ) : (
                `${r.registered_events?.length ?? 0} registered`
              ),
          },
          { key: "created_at", label: "Joined", render: (r) => fmtDate(r.created_at), width: 110 },
        ]}
      />
    </>
  );
}
