import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "../useAutoRefresh.js";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, can, canOpen, getSession, hasFullAccess, IS_DEMO, isSupport, permissionTitle, logout } from "../api.js";
import { DesignSwitch } from "../design.jsx";

// One menu for the whole REIFGO Team (Oct 6). Each person sees the pages
// their areas open (canOpen); the server fences the same pages.
const NAV = [
  { to: "/admin", label: "Dashboard", icon: "▦", end: true },
  // Listings live inside each developer's page (Syed, Sept 22).
  { to: "/admin/developers", label: "Developers & Listings", icon: "◈" },
  { to: "/admin/events", label: "Events", icon: "◷" },
  { to: "/admin/insights", label: "Insights", icon: "◪" },
  { to: "/admin/summit", label: "Forum", icon: "◫" },
  { to: "/admin/leads", label: (s) => (can("leads_all", s) ? "Leads" : "My Leads"), icon: "◎" },
  { to: "/admin/team", label: "Sales Team", icon: "◍" },
  // "Investors", not "Users": the people using the app (Syed, Sept 22 + 24).
  { to: "/admin/users", label: "Investors", icon: "◉" },
  { to: "/admin/approvals", label: "Approvals", icon: "✓", badge: "approvals" },
  { to: "/admin/staff", label: "REIFGO Team", icon: "◇" },
  { to: "/admin/activity", label: "Activity Log", icon: "≡" },
];
// Pages with a V2 design (see design.jsx): the switch only shows on these.
const V2_PAGES = /^\/admin(\/leads)?\/?$/;

export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [approvals, setApprovals] = useState(0);
  const location = useLocation();
  const session = getSession();
  const showApprovals = can("approvals", session);

  // The Approvals count: fetched on each page change and every 20s, and set
  // straight away when the Approvals page approves or declines something.
  const loadApprovals = useCallback(() => {
    if (!showApprovals || IS_DEMO) return;
    api.get("/admin/approvals").then((q) => setApprovals(q.total ?? 0)).catch(() => {});
  }, [showApprovals]);
  useEffect(() => {
    loadApprovals();
  }, [loadApprovals, location.pathname]);
  useAutoRefresh(loadApprovals);
  // Keeps "Online" accurate for accounts that don't poll the approvals count.
  const heartbeat = useCallback(() => {
    if (showApprovals || IS_DEMO || !getSession()) return;
    api.get("/admin/me").catch(() => {});
  }, [showApprovals]);
  useAutoRefresh(heartbeat, { intervalMs: 60000 });
  useEffect(() => {
    const onCount = (e) => setApprovals(e.detail ?? 0);
    window.addEventListener("reifgo:approvals", onCount);
    return () => window.removeEventListener("reifgo:approvals", onCount);
  }, []);

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const nav = NAV.filter((item) => canOpen(item.to, session)).map((item) => ({
    ...item,
    label: typeof item.label === "function" ? item.label(session) : item.label,
  }));
  // A page their areas don't open: go to the first one that does.
  if (!canOpen(location.pathname, session)) {
    return <Navigate to={nav[0]?.to ?? "/admin/account"} replace />;
  }
  const full = hasFullAccess(session);
  const portalLabel = full ? "Admin Dashboard" : "REIFGO Team";
  const roleLabel = session.role === "admin" ? "Owner" : session.position || permissionTitle(session.permissions, full);
  // The V1 / V2 switch is for the pages that have a V2; support-only
  // accounts never see those pages anyway.
  const support = isSupport(session);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="adm-shell">
      {/* Mobile-only top bar; hidden on desktop where the sidebar is fixed */}
      <header className="adm-topbar">
        <button
          className="adm-topbar__burger"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="adm-topbar__logo">REIFGO</span>
        <span className="adm-topbar__sub">{full ? "Admin" : "Team"}</span>
      </header>

      {menuOpen && <div className="adm-scrim" onClick={closeMenu} />}

      <aside className={`adm-sidebar${menuOpen ? " is-open" : ""}`}>
        <div className="adm-sidebar__brand">
          <span className="adm-sidebar__logo">REIFGO</span>
          <span className="adm-sidebar__sub">{portalLabel}</span>
        </div>

        <nav className="adm-sidebar__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `adm-nav-link${isActive ? " is-active" : ""}`
              }
            >
              <span className="adm-nav-link__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              {item.badge === "approvals" && approvals > 0 && (
                <span className="adm-nav-link__badge" aria-label={`${approvals} waiting`}>{approvals}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Syed, Sept 24: V1 / V2 above the account name, only on the pages
            that have a V2 (Dashboard and Leads). */}
        {!support && V2_PAGES.test(location.pathname) && <DesignSwitch />}

        {/* Syed: click the name to change your details or password. */}
        <Link to="/admin/account" className="adm-account adm-account--link" onClick={closeMenu} title="Account settings">
          <span className="adm-account__dot" aria-hidden="true" />
          <div className="adm-account__info">
            <strong>{session.name}</strong>
            <span>{roleLabel}</span>
          </div>
          <span className="adm-account__chev" aria-hidden="true">›</span>
        </Link>

        <button
          className="adm-nav-link adm-sidebar__logout"
          onClick={() => {
            logout();
            navigate("/admin/login");
          }}
        >
          <span className="adm-nav-link__icon" aria-hidden="true">⏻</span>
          Log out
        </button>
      </aside>

      <main className="adm-main">
        {IS_DEMO && (
          <div className="adm-demo-banner">
            Demo mode — sample data. Changes are kept for this session only.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
