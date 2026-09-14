import Icon from "./Icon.jsx";
import "./AdvisorSidebar.css";

// The advisor is the chat itself; the other workspace entries already exist
// elsewhere — market research on the site, listings and saved assets in the
// investor app — so each opens that real screen instead of going nowhere.
const APP_URL = "https://reifgo.expo.app";

const NAV = [
  { icon: "chat", label: "AI Chat", active: true, href: "/advisor" },
  { icon: "trendUp", label: "Market Trends", href: "/insights" },
  { icon: "building", label: "Property Match", href: `${APP_URL}/listings`, external: true },
  { icon: "bookmark", label: "Saved Assets", href: `${APP_URL}/saved`, external: true },
  { icon: "gear", label: "Settings", href: `${APP_URL}/settings`, external: true },
];

export default function AdvisorSidebar({ className = "", onClose, onNavigate }) {
  return (
    <aside className={`ads${className ? ` ${className}` : ""}`}>
      {/* Only visible on mobile, where the sidebar slides in as a panel */}
      <button className="ads__close" aria-label="Close menu" onClick={onClose}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className="ads__profile">
        <span className="ads__avatar">
          <img src="/advisor-avatar.jpg" alt="" />
        </span>
        <div className="ads__id">
          <span className="ads__name">Global Advisor</span>
          <span className="ads__tier">Accredited Tier</span>
        </div>
      </div>

      <nav className="ads__nav" aria-label="Workspace">
        {NAV.map((n) => (
          <a
            key={n.label}
            href={n.href}
            {...(n.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            aria-current={n.active ? "page" : undefined}
            onClick={onNavigate}
            className={`ads__link${n.active ? " is-active" : ""}`}
          >
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
