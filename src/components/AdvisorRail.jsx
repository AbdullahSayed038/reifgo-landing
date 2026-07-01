import Icon from "./Icon.jsx";
import "./AdvisorRail.css";

const PULSE = [
  { label: "Dubai Prime Index", value: "+12.4%", icon: "arrowUpRight", trend: "up" },
  { label: "Global RE Liquidity", value: "Stable", icon: "scale", trend: "flat" },
];

export default function AdvisorRail({ className = "" }) {
  return (
    <aside className={`arail${className ? ` ${className}` : ""}`}>
      <div className="arail__pulse" data-reveal>
        <h4 className="arail__heading">Market Pulse</h4>
        <div className="arail__stats">
          {PULSE.map((s) => (
            <div className="arail__stat" key={s.label}>
              <div>
                <span className="arail__stat-label">{s.label}</span>
                <span className="arail__stat-value">{s.value}</span>
              </div>
              <span className={`arail__trend arail__trend--${s.trend}`}>
                <Icon name={s.icon} size={14} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="arail__rec" data-reveal style={{ "--reveal-delay": "0.08s" }}>
        <span className="arail__rec-kicker">Advisor Recommendation</span>
        <p className="arail__rec-text">
          Leverage 40% LTV on UK Commercial Assets to optimize current tax
          exposure.
        </p>
        <button className="arail__rec-btn">Action Analysis</button>
      </div>

      <div className="arail__report-wrap" data-reveal style={{ "--reveal-delay": "0.16s" }}>
        <div className="arail__report">
          <img src="/market-report.jpg" alt="" />
          <div className="arail__report-caption">
            <span className="arail__report-title">Global Market Report</span>
            <span className="arail__report-sub">Q4 Institutional Outlook</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
