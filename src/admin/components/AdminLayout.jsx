import { useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getToken, IS_DEMO, logout } from "../api.js";
import { useCurrency } from "../currency.jsx";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: "▦", end: true },
  { to: "/admin/properties", label: "Properties", icon: "◨" },
  { to: "/admin/developers", label: "Developers", icon: "◈" },
  { to: "/admin/events", label: "Events", icon: "◷" },
  { to: "/admin/leads", label: "Leads", icon: "◎" },
  { to: "/admin/users", label: "Users", icon: "◉" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!getToken()) {
    return <Navigate to="/admin/login" replace />;
  }

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
        <span className="adm-topbar__sub">Admin</span>
      </header>

      {menuOpen && <div className="adm-scrim" onClick={closeMenu} />}

      <aside className={`adm-sidebar${menuOpen ? " is-open" : ""}`}>
        <div className="adm-sidebar__brand">
          <span className="adm-sidebar__logo">REIFGO</span>
          <span className="adm-sidebar__sub">Admin Dashboard</span>
        </div>

        <nav className="adm-sidebar__nav">
          {NAV.map((item) => (
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
            </NavLink>
          ))}
        </nav>

        <div className="adm-currency" role="group" aria-label="Display currency">
          <span className="adm-currency__label">Currency</span>
          <div className="adm-currency__switch">
            {["USD", "AED"].map((c) => (
              <button
                key={c}
                className={`adm-currency__opt${currency === c ? " is-active" : ""}`}
                onClick={() => setCurrency(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

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
