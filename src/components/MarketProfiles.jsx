import Icon from "./Icon.jsx";
import "./MarketProfiles.css";

const INVESTOR_POINTS = [
  "Access to accredited developers and institutional-grade projects.",
  "Exclusive international investment opportunities not found on the open market.",
  "Comprehensive due diligence and transparent project performance tracking.",
  "Simplified cross-border transaction infrastructure and compliance support.",
];

const STATS = [
  { value: "50k+", label: "Verified Leads" },
  { value: "45+", label: "Countries Covered" },
];

export default function MarketProfiles() {
  return (
    <section className="mp section" style={{ background: "var(--surface-soft)" }}>
      <div className="mp__grid container">
        {/* ---- For investors ---- */}
        <div className="mp__col" data-reveal>
          <p className="eyebrow">For Investors</p>
          <h2 className="heading h2 mp__title">
            Institutional Access to Global Assets.
          </h2>
          <div className="mp__visual mp__visual--sage" aria-hidden="true" />
          <ul className="mp__points">
            {INVESTOR_POINTS.map((p) => (
              <li key={p}>
                <Icon name="check" size={19} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ---- For developers (offset down) ---- */}
        <div className="mp__col mp__col--offset" data-reveal style={{ "--reveal-delay": "0.1s" }}>
          <p className="eyebrow">For Developers</p>
          <h2 className="heading h2 mp__title">
            Reach More Investors. Generate More Leads.
          </h2>
          <div className="mp__visual mp__visual--photo">
            <img src="/developer-building.png" alt="Modern apartment development facade" />
          </div>

          <div className="mp__accred">
            <h3 className="mp__accred-title">Accreditation Matters</h3>
            <p className="mp__accred-body">
              Trust is the foundation of our ecosystem. We work exclusively with
              accredited developers to ensure that every opportunity on the
              REIFGO platform meets the highest standards of professional
              integrity and project viability.
            </p>
            <div className="mp__stats">
              {STATS.map((s) => (
                <div className="mp__stat" key={s.label}>
                  <span className="mp__stat-value">{s.value}</span>
                  <span className="mp__stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
