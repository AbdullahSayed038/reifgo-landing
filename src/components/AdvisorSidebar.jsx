import Icon from "./Icon.jsx";
import "./AdvisorSidebar.css";

const NAV = [
  { icon: "chat", label: "AI Chat", active: true },
  { icon: "trendUp", label: "Market Trends" },
  { icon: "building", label: "Property Match" },
  { icon: "bookmark", label: "Saved Assets" },
  { icon: "gear", label: "Settings" },
];

export default function AdvisorSidebar() {
  return (
    <aside className="ads">
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
            href="#"
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
