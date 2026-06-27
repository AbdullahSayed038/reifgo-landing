import Icon from "./Icon.jsx";
import "./ExecutiveAdvisory.css";

const ITEMS = [
  {
    icon: "marketExpansion",
    title: "Market Expansion",
    body: "Quantifying risk and opportunity in emerging real estate markets.",
  },
  {
    icon: "strategicAlliances",
    title: "Strategic Alliances",
    body: "Facilitating joint ventures between developers and capital providers.",
  },
  {
    icon: "institutionalGrowth",
    title: "Institutional Growth",
    body: "Structuring portfolios for institutional-grade debt and equity financing.",
  },
];

export default function ExecutiveAdvisory() {
  return (
    <section className="adv section">
      <div className="adv__grid container">
        <div className="adv__content" data-reveal>
          <p className="adv__eyebrow">03. Executive Advisory</p>
          <h2 className="adv__title">Partnership &amp; Business Development</h2>
          <p className="adv__lead">
            REIFGO provides specialized consultancy to unlock new market
            territories. We focus on creating strategic alliances that withstand
            market volatility and drive institutional growth.
          </p>

          <ul className="adv__list">
            {ITEMS.map((it) => (
              <li className="adv__item" key={it.title}>
                <span className="adv__item-icon">
                  <Icon name={it.icon} size={20} />
                </span>
                <div>
                  <h5 className="adv__item-title">{it.title}</h5>
                  <p className="adv__item-body">{it.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="adv__media" data-reveal style={{ "--reveal-delay": "0.1s" }}>
          <span className="adv__sq adv__sq--br" aria-hidden="true" />
          <span className="adv__sq adv__sq--tr" aria-hidden="true" />
          <div className="adv__photo">
            <img src="/advisory-meeting.png" alt="REIFGO advisory team in a strategy session" />
          </div>
        </div>
      </div>
    </section>
  );
}
