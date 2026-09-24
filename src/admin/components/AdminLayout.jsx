import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "../useAutoRefresh.js";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, can, getSession, IS_DEMO, isReifgoTier, isSupport, logout, permissionTitle } from "../api.js";

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: "▦", end: true },
  // Listings live inside each developer's page (Syed, Sept 22).
  { to: "/admin/developers", label: "Developers & Listings", icon: "◈" },
  { to: "/admin/events", label: "Events", icon: "◷" },
  { to: "/admin/insights", label: "Insights", icon: "◪" },
  { to: "/admin/summit", label: "Forum", icon: "◫" },
  { to: "/admin/leads", label: "Leads", icon: "◎" },
  // Syed asked what the difference was: developers' sales staff vs people in the app.
  { to: "/admin/team", label: "Sales Teams", icon: "◍" },
  // "Investors", not "Users": the people using the app (Syed, Sept 22 + 24).
  { to: "/admin/users", label: "Investors", icon: "◉" },
  { to: "/admin/approvals", label: "Approvals", icon: "✓", badge: "approvals" },
  { to: "/admin/staff", label: "REIFGO Team", icon: "◇" },
  { to: "/admin/activity", label: "Activity Log", icon: "≡" },
];

const DEVELOPER_NAV = [
  { to: "/admin", label: "Dashboard", icon: "▦", end: true },
  { to: "/admin/properties", label: "My Properties", icon: "◨" },
  { to: "/admin/insights", label: "Insights", icon: "◪" },
  { to: "/admin/leads", label: "Leads", icon: "◎" },
  { to: "/admin/team", label: "Team", icon: "◍" },
  { to: "/admin/company", label: "Company Profile", icon: "◈" },
  { to: "/admin/activity", label: "Activity Log", icon: "≡" },
];

// Customer support helps app investors and sees nothing else.
const SUPPORT_NAV = [
  { to: "/admin/users", label: "Investors", icon: "◉" },
  { to: "/admin/activity", label: "Activity Log", icon: "≡" },
];
const SUPPORT_PATHS = /^\/admin\/(users|activity|account)(\/|$)/;

// A team account's menu follows its permissions.
function teamNav(session) {
  return [
    { to: "/admin", label: "Dashboard", icon: "▦", end: true },
    { to: "/admin/leads", label: can("view_all_leads", session) ? "Leads" : "My Leads", icon: "◎" },
    ...(can("manage_properties", session) ? [{ to: "/admin/properties", label: "Properties", icon: "◨" }] : []),
    { to: "/admin/team", label: "Team", icon: "◍" },
    ...(can("edit_company", session) ? [{ to: "/admin/company", label: "Company Profile", icon: "◈" }] : []),
    ...(can("manage_team", session) ? [{ to: "/admin/activity", label: "Activity Log", icon: "≡" }] : []),
  ];
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [approvals, setApprovals] = useState(0);
  const location = useLocation();
  const session = getSession();
  const reifgo = isReifgoTier(session);

  // The Approvals count: fetched on each page change and every 20s, and set
  // straight away when the Approvals page approves or declines something.
  const loadApprovals = useCallback(() => {
    if (!reifgo || IS_DEMO) return;
    api.get("/admin/approvals").then((q) => setApprovals(q.total ?? 0)).catch(() => {});
  }, [reifgo]);
  useEffect(() => {
    loadApprovals();
  }, [loadApprovals, location.pathname]);
  useAutoRefresh(loadApprovals);
  // Keeps "Online" accurate for accounts that don't poll the approvals count.
  const heartbeat = useCallback(() => {
    if (reifgo || IS_DEMO || !getSession()) return;
    api.get("/admin/me").catch(() => {});
  }, [reifgo]);
  useAutoRefresh(heartbeat, { intervalMs: 60000 });
  useEffect(() => {
    const onCount = (e) => setApprovals(e.detail ?? 0);
    window.addEventListener("reifgo:approvals", onCount);
    return () => window.removeEventListener("reifgo:approvals", onCount);
  }, []);

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const isDeveloper = session.role === "developer";
  const isBroker = session.role === "broker";
  const support = isSupport(session);
  // Support's home is the Investors page; the rest of the CMS isn't theirs.
  if (support && !SUPPORT_PATHS.test(location.pathname)) {
    return <Navigate to="/admin/users" replace />;
  }
  const nav = support ? SUPPORT_NAV : isBroker ? teamNav(session) : isDeveloper ? DEVELOPER_NAV : ADMIN_NAV;
  const portalLabel = support
    ? "Support Desk"
    : isBroker
      ? "Sales Portal"
      : isDeveloper
        ? "Developer Portal"
        : "Admin Dashboard";
  const roleLabel = support
    ? "Customer support"
    : isBroker
      ? permissionTitle(session.permissions)
      : isDeveloper
        ? "Developer account"
        : session.role === "regional_admin"
          ? "Regional admin"
          : "Administrator";

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
        <span className="adm-topbar__sub">{support ? "Support" : isBroker ? "Sales Agent" : isDeveloper ? "Portal" : "Admin"}</span>
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
