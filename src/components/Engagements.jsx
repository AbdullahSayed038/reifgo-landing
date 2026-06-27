import Icon from "./Icon.jsx";
import "./Engagements.css";

const CARDS = [
  {
    icon: "roadshows",
    title: "Corporate Roadshows",
    body: "Direct institutional introductions tailored for large-scale development portfolios.",
  },
  {
    icon: "webinars",
    title: "Corporate Webinars",
    body: "Interactive digital symposiums for global capital distribution and market updates.",
  },
  {
    icon: "localRoadshows",
    title: "Local Investment Roadshows",
    body: "Niche, high-impact regional gatherings connecting local developers with domestic HNWIs.",
  },
  {
    icon: "roundTable",
    title: "International Round Tables",
    body: "Elite, invitation-only summits discussing cross-border liquidity and global trends.",
  },
];

export default function Engagements() {
  return (
    <section className="eng">
      <span className="eng__bg" aria-hidden="true" />
      <div className="eng__inner container">
        <header className="eng__head" data-reveal>
          <div className="eng__intro">
            <p className="eng__eyebrow">02. Strategic Engagements</p>
            <h2 className="eng__title">Roadshows &amp; Webinars</h2>
          </div>
          <p className="eng__note">
            Elevating market visibility through curated physical and digital
            event architectures.
          </p>
        </header>

        <ul className="eng__grid">
          {CARDS.map((c, i) => (
            <li
              className="eng__card"
              key={c.title}
              data-reveal
              style={{ "--reveal-delay": `${i * 0.07}s` }}
            >
              <span className="eng__icon">
                <Icon name={c.icon} size={28} />
              </span>
              <h3 className="eng__card-title">{c.title}</h3>
              <p className="eng__card-body">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
