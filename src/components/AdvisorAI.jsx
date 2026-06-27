import Icon from "./Icon.jsx";
import "./AdvisorAI.css";

const FEATURES = [
  "Hyper-local market volatility analysis",
  "24/7 cross-border compliance checks",
  "Automated portfolio rebalancing suggestions",
];

export default function AdvisorAI() {
  return (
    <section className="ai section">
      <div className="ai__grid container">
        <div className="ai__copy" data-reveal>
          <p className="eyebrow ai__eyebrow">The Advisor</p>
          <h2 className="ai__title">
            REIFGO AI: Your Private Portfolio Desk
          </h2>
          <p className="ai__lead">
            Leverage generative intelligence trained on decades of global
            property transactions. Instant feasibility reports, yield
            forecasting, and risk modeling.
          </p>
          <ul className="ai__list">
            {FEATURES.map((f) => (
              <li key={f}>
                <Icon name="check" size={19} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ai__panel" data-reveal style={{ "--reveal-delay": "0.12s" }}>
          <div className="ai__panel-head">
            <span className="ai__status">
              <span className="ai__dot" />
              System Active
            </span>
            <span className="ai__version">v4.0.2</span>
          </div>

          <div className="ai__panel-body">
            <div className="ai__bubble">
              Analyzing prime residential yields in Downtown Dubai for Q3 2025.
              Current weighted average yield is 6.8% with 12.4% year-over-year
              capital appreciation. Would you like a risk-adjusted forecast for
              specific project clusters?
            </div>
            <p className="ai__bubble-tag">Advisor AI</p>
          </div>

          <div className="ai__panel-foot">
            <div className="ai__input">
              <span>Ask REIFGO AI...</span>
              <Icon name="send" size={17} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
