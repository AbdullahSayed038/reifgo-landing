import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, getSession, isReifgoTier } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { initials } from "../leadUtils.js";
import { useAutoRefresh } from "../useAutoRefresh.js";

// What the type filter offers, by the start of the action key.
const TYPES = [
  { value: "", label: "All activity" },
  { value: "signin", label: "Sign-ins" },
  { value: "lead", label: "Leads" },
  { value: "listing", label: "Listings" },
  { value: "team", label: "Team accounts" },
  { value: "developer", label: "Developers" },
  { value: "staff", label: "REIFGO team" },
  { value: "amenity", label: "Amenities" },
  { value: "logo", label: "Logos" },
];

const RANGES = [
  { value: 1, label: "24h" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 0, label: "All" },
];

const ROLE = {
  admin: "REIFGO",
  reifgo_admin: "REIFGO",
  regional_admin: "Regional admin",
  developer: "Developer",
  broker: "Sales team",
  system: "System",
};

/** Where an entry's "Open" link goes. */
function targetLink(item) {
  switch (item.target_type) {
    case "lead":
      return `/admin/leads/${item.target_id}`;
    case "listing":
      return item.action === "listing.removed" ? null : `/admin/properties/${item.target_id}`;
    case "developer":
      return item.action === "developer.removed" ? null : `/admin/developers/${item.target_id}`;
    case "team":
      return "/admin/team";
    case "staff":
      return "/admin/staff";
    default:
      return null;
  }
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

const time = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Who did what in the CMS (Syed, Sept 24): sign-ins, approvals, access
 * changes, listing and lead changes. REIFGO sees everything in its scope; a
 * developer, or a manager, their own company's.
 */
export default function Activity() {
  const session = getSession();
  const reifgo = isReifgoTier(session);
  const [items, setItems] = useState(null);
  const [next, setNext] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [days, setDays] = useState(30);
  const [type, setType] = useState("");
  const [developer, setDeveloper] = useState("");
  const [actor, setActor] = useState("");
  const [developers, setDevelopers] = useState([]);
  const [people, setPeople] = useState(new Map());
  const toast = useToast();
  // Once "Load more" has been used, the 30-second refresh would throw those
  // pages away, so it waits until the filters change.
  const loadedMore = useRef(false);

  useEffect(() => {
    if (reifgo) api.get("/admin/developers").then(setDevelopers).catch(() => {});
  }, [reifgo]);

  const query = useCallback(
    (before) => {
      const params = new URLSearchParams();
      if (days) params.set("days", String(days));
      if (type) params.set("action", type);
      if (developer) params.set("developer_id", developer);
      if (actor) params.set("actor_id", actor);
      if (q.trim()) params.set("q", q.trim());
      if (before) params.set("before", before);
      return api.get(`/admin/activity?${params}`);
    },
    [days, type, developer, actor, q],
  );

  // The people seen so far, for the "person" filter.
  const remember = (rows) =>
    setPeople((prev) => {
      const map = new Map(prev);
      for (const r of rows) if (r.actor_id && !map.has(r.actor_id)) map.set(r.actor_id, r.actor_name);
      return map;
    });

  const load = useCallback(() => {
    loadedMore.current = false;
    query()
      .then((r) => {
        setItems(r.items);
        setNext(r.next);
        remember(r.items);
      })
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Typing in search waits a moment before asking the server.
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const refresh = useCallback(() => {
    if (!loadedMore.current) load();
  }, [load]);
  useAutoRefresh(refresh, { intervalMs: 30000 });

  const more = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    loadedMore.current = true;
    try {
      const r = await query(next);
      setItems((prev) => [...(prev ?? []), ...r.items]);
      setNext(r.next);
      remember(r.items);
    } catch (e) {
      toast.error(e.message);
    }
    setLoadingMore(false);
  };

  const groups = useMemo(() => {
    const out = [];
    for (const item of items ?? []) {
      const label = dayLabel(item.created_at);
      if (!out.length || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(item);
    }
    return out;
  }, [items]);

  const filtered = !!(type || developer || actor || q.trim());

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Activity log</h1>
          <p>
            {reifgo
              ? "Who did what in the CMS: sign-ins, approvals, access changes, listings and leads."
              : "Who did what in your company's account: sign-ins, team changes, listings and leads."}
          </p>
        </div>
      </header>

      <div className="adm-activity-filters">
        <input
          className="adm-activity-filters__search"
          type="search"
          placeholder="Search the log…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="adm-segmented" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={days === r.value ? "is-active" : ""}
              onClick={() => setDays(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select className="adm-inline-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {reifgo && developers.length > 0 && (
          <select className="adm-inline-select" value={developer} onChange={(e) => setDeveloper(e.target.value)} aria-label="Developer">
            <option value="">All developers</option>
            {developers.map((d) => <option key={d.id} value={d.id}>{d.name.replace(/\s+/g, " ").trim()}</option>)}
          </select>
        )}
        {people.size > 0 && (
          <select className="adm-inline-select" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Person">
            <option value="">Everyone</option>
            {[...people.entries()]
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>

      {items === null ? (
        <section className="adm-panel"><p className="adm-panel__empty">Loading…</p></section>
      ) : items.length === 0 ? (
        <section className="adm-panel">
          <p className="adm-panel__empty">
            {filtered ? "Nothing matches these filters." : "Nothing logged in this period yet. Activity is recorded from Sept 24, 2026."}
          </p>
        </section>
      ) : (
        groups.map((g) => (
          <section className="adm-panel adm-activity" key={g.label}>
            <header className="adm-panel__head"><h2>{g.label}</h2></header>
            <ol className="adm-activity__list">
              {g.items.map((item) => {
                const link = targetLink(item);
                return (
                  <li key={item.id} className="adm-activity__item">
                    <time className="adm-activity__time" dateTime={item.created_at}>{time(item.created_at)}</time>
                    <span className="adm-avatar adm-activity__avatar" aria-hidden="true">{initials(item.actor_name)}</span>
                    <div className="adm-activity__body">
                      <p>
                        <strong>{item.actor_name}</strong>{" "}
                        <span className="adm-activity__role">{ROLE[item.actor_role] ?? item.actor_role}</span>
                      </p>
                      <p className="adm-activity__summary">{item.summary}</p>
                      {reifgo && item.developer_name && (
                        <p className="adm-activity__meta">{item.developer_name}</p>
                      )}
                    </div>
                    {link && (
                      <Link className="adm-btn adm-btn--ghost adm-btn--sm adm-activity__open" to={link}>Open</Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {next && (
        <div className="adm-activity__more">
          <button className="adm-btn adm-btn--ghost" disabled={loadingMore} onClick={more}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
