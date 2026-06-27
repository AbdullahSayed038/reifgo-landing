import Icon from "./Icon.jsx";
import "./AdvisorChat.css";

const CHIPS = ["Market Pulse: London", "Risk Assessment", "Portfolio Rebalance"];

export default function AdvisorChat() {
  return (
    <section className="achat">
      <div className="achat__space">
        <div className="achat__thread">
          <div className="achat__user" data-reveal>
            <div className="achat__bubble">
              AI Advisor, identify the best ROI projects in Dubai Marina
              currently available for institutional entry. Focus on waterfront
              developments with proven rental yields.
            </div>
          </div>

          <div className="achat__ai" data-reveal style={{ "--reveal-delay": "0.1s" }}>
            <div className="achat__card">
              <div className="achat__card-head">
                <Icon name="barChart" size={18} />
                <span>Institutional Insights</span>
              </div>

              <p className="achat__card-text">
                Based on current market dynamics and capital flow analysis, Dubai
                Marina continues to show strong appreciation in the ultra-luxury
                segment. Institutional interest has pivoted toward "The Marina
                Sands" and "Cove Residences" due to their unique architectural
                positioning and high occupancy rates (94%+).
              </p>

              <article className="achat__prop">
                <div className="achat__prop-media">
                  <img src="/marina-sands.png" alt="Marina Sands Residences towers" />
                  <span className="achat__prop-badge">Prime ROI</span>
                </div>
                <div className="achat__prop-info">
                  <div className="achat__prop-top">
                    <h3 className="achat__prop-title">Marina Sands Residences</h3>
                    <span className="achat__prop-loc">
                      <Icon name="pin" size={12} />
                      Dubai Marina, UAE
                    </span>
                  </div>
                  <div className="achat__prop-stats">
                    <div className="achat__stat">
                      <span className="achat__stat-label">Projected Yield</span>
                      <span className="achat__stat-value">8.4% Net</span>
                    </div>
                    <div className="achat__stat">
                      <span className="achat__stat-label">Entry Point</span>
                      <span className="achat__stat-value">$1.2M USD</span>
                    </div>
                  </div>
                  <a href="#" className="achat__prop-link">
                    View Data Deck
                    <Icon name="chevronRight" size={12} />
                  </a>
                </div>
              </article>

              <blockquote className="achat__quote">
                "Institutional data suggests a secondary market surge in the next
                14 months for 3-bedroom configurations."
              </blockquote>
            </div>
          </div>
        </div>
      </div>

      <div className="achat__input">
        <form className="achat__field" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            className="achat__textbox"
            placeholder="Ask REIFGO Advisor about global portfolio strategies..."
            aria-label="Ask REIFGO Advisor"
          />
          <button type="submit" className="achat__send" aria-label="Send">
            <Icon name="send" size={19} />
          </button>
        </form>
        <div className="achat__chips">
          {CHIPS.map((c) => (
            <button key={c} className="achat__chip">{c}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
