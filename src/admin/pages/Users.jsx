import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getSession, isSupport, maskPhone } from "../api.js";
import DataTable from "../components/DataTable.jsx";
import Presence from "../components/Presence.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useToast } from "../components/Toast.jsx";
import { REGIONS } from "../regions.js";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const WEEK_MS = 7 * 86400000;

/** "3 of 6 · 1 to review", or nothing uploaded yet. */
function DocumentsCell({ d }) {
  if (!d?.uploaded) return <span className="adm-muted">None yet</span>;
  return (
    <div className="adm-cell-stack">
      <strong>{d.uploaded} of {d.total}</strong>
      <span>
        {[
          d.pending_review && `${d.pending_review} to review`,
          d.rejected && `${d.rejected} sent back`,
          d.verified && `${d.verified} verified`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  );
}

/**
 * Investors: the people using the REIFGO app (Syed, Sept 24). Region,
 * country and the rest, sortable and filterable; open one for their profile,
 * enquiries and documents.
 */
export default function Users() {
  const [rows, setRows] = useState(null);
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [docs, setDocs] = useState("");
  const [tier, setTier] = useState("");
  const toast = useToast();
  const navigate = useNavigate();
  const session = getSession();
  const support = isSupport(session);

  useEffect(() => {
    api.get("/admin/users").then(setRows).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countries = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const shown = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        if (region && (r.region ?? "Other") !== region) return false;
        if (country && r.country !== country) return false;
        if (tier && r.tier !== tier) return false;
        if (status === "verified" && !r.is_verified) return false;
        if (status === "unverified" && (r.is_verified || r.is_suspended)) return false;
        if (status === "suspended" && !r.is_suspended) return false;
        if (docs === "review" && !r.documents.pending_review) return false;
        if (docs === "none" && r.documents.uploaded) return false;
        if (docs === "complete" && r.documents.uploaded < r.documents.total) return false;
        return true;
      }),
    [rows, region, country, status, docs, tier],
  );

  const stats = useMemo(() => {
    const all = rows ?? [];
    return {
      total: all.length,
      week: all.filter((r) => Date.now() - new Date(r.created_at).getTime() < WEEK_MS).length,
      review: all.filter((r) => r.documents.pending_review > 0).length,
      verified: all.filter((r) => r.is_verified).length,
    };
  }, [rows]);

  const filtered = !!(region || country || status || docs || tier);
  const reset = () => {
    setRegion("");
    setCountry("");
    setStatus("");
    setDocs("");
    setTier("");
  };

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Investors</h1>
          <p>
            People who signed up in the REIFGO app. Developers' sales staff are under Sales Teams, and REIFGO's own
            staff under REIFGO Team.
            {support ? " You can update an investor's details; only REIFGO admins open documents." : ""}
          </p>
        </div>
      </header>

      <div className="adm-stat-grid adm-stat-grid--4">
        <StatCard label="Investors" value={rows ? stats.total : null} onClick={reset} />
        <StatCard label="Joined in the last 7 days" value={rows ? stats.week : null} />
        <StatCard
          label="Documents to review"
          value={rows ? stats.review : null}
          accent={stats.review > 0}
          hint={stats.review ? "Investors with an upload waiting" : undefined}
          onClick={() => setDocs("review")}
        />
        <StatCard label="Verified investors" value={rows ? stats.verified : null} onClick={() => setStatus("verified")} />
      </div>

      <div className="adm-activity-filters adm-investor-filters">
        <select className="adm-inline-select" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="">All regions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          <option value="Other">Other</option>
        </select>
        <select className="adm-inline-select" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="adm-inline-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Not verified yet</option>
          <option value="suspended">Suspended</option>
        </select>
        <select className="adm-inline-select" value={docs} onChange={(e) => setDocs(e.target.value)} aria-label="Documents">
          <option value="">Any documents</option>
          <option value="review">Waiting for review</option>
          <option value="none">None uploaded</option>
          <option value="complete">All uploaded</option>
        </select>
        <select className="adm-inline-select" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Tier">
          <option value="">Any tier</option>
          <option value="regular">Regular</option>
          <option value="premium_investor">Premium</option>
        </select>
        {filtered && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={reset}>
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        rows={shown}
        searchKeys={["full_name", "phone", "email", "city", "country", "nationality"]}
        searchPlaceholder="Search by name, email, phone or city…"
        emptyText={rows === null ? "Loading…" : filtered ? "No investors match these filters." : "No investors yet."}
        onRowClick={(r) => navigate(`/admin/users/${r.id}`)}
        columns={[
          {
            key: "full_name",
            label: "Investor",
            render: (r) => (
              <div className="adm-cell-stack">
                <strong>
                  {r.full_name || "Name not given"}
                  {r.is_verified && <span className="adm-badge adm-badge--active adm-badge--inline">Verified</span>}
                  {r.is_suspended && <span className="adm-badge adm-badge--closed adm-badge--inline">Suspended</span>}
                </strong>
                <span>{r.email || maskPhone(r.phone)}</span>
              </div>
            ),
          },
          {
            key: "country",
            label: "Lives in",
            width: 190,
            render: (r) => [r.city, r.country].filter(Boolean).join(", ") || "—",
          },
          { key: "region", label: "Region", width: 120, render: (r) => r.region ?? "Other" },
          { key: "investment_goal", label: "Goal", width: 130, render: (r) => r.investment_goal ?? "—" },
          { key: "tier", label: "Tier", width: 100, render: (r) => <StatusBadge value={r.tier} /> },
          {
            key: "documents",
            label: "Documents",
            width: 150,
            sortValue: (r) => r.documents.pending_review * 100 + r.documents.uploaded,
            render: (r) => <DocumentsCell d={r.documents} />,
          },
          { key: "leads", label: "Enquiries", width: 90, sortValue: (r) => r._count?.leads ?? 0, render: (r) => r._count?.leads ?? 0 },
          {
            key: "last_seen_at",
            label: "Last active",
            width: 150,
            sortValue: (r) => (r.last_seen_at ? new Date(r.last_seen_at).getTime() : null),
            render: (r) => (r.last_seen_at ? <Presence at={r.last_seen_at} /> : <span className="adm-muted" title="Not active since this started being recorded (Sept 24)">—</span>),
          },
          {
            key: "created_at",
            label: "Joined",
            width: 110,
            sortValue: (r) => new Date(r.created_at).getTime(),
            render: (r) => fmtDate(r.created_at),
          },
        ]}
      />
    </>
  );
}
