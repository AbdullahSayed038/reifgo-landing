import Icon from "./Icon.jsx";
import "./Services.css";

const SERVICES = [
  {
    icon: "partnership",
    title: "Partnership Advisory",
    body: "We facilitate strategic alliances between developers, technology providers, and institutional capital to drive innovation and project success at scale.",
  },
  {
    icon: "roadshows",
    title: "Corporate Roadshows",
    body: "Strategic events designed for high-level engagement between institutional players and major project owners.",
  },
  {
    icon: "webinars",
    title: "Corporate Webinars",
    body: "Digital platforms for project reveals and market analysis, accessible to our global network of accredited investors.",
  },
  {
    icon: "localRoadshows",
    title: "Local Investment Roadshows",
    body: "Focused regional events connecting local capital with high-potential domestic and international developments.",
  },
  {
    icon: "roundTable",
    title: "International Round Table Roadshows",
    body: "Exclusive, closed-door discussions in major financial hubs, facilitating cross-border partnerships and large-scale deals.",
  },
  {
    icon: "bizDev",
    title: "Business Development Advisory",
    body: "Expert strategic consulting to help developers enter new markets and optimize their global distribution channels.",
  },
];

export default function Services() {
  return (
    <section className="svc section" style={{ background: "var(--surface-soft)" }}>
      <div className="svc__inner container">
        <header className="svc__head" data-reveal>
          <div>
            <p className="eyebrow">What We Do</p>
            <h2 className="heading h2 svc__title">Structural Expertise</h2>
          </div>
          <a href="#" className="arrow-link">
            View All Services
            <Icon name="arrowRight" size={14} />
          </a>
        </header>

        <ul className="svc__grid">
          {SERVICES.map((s, i) => (
            <li
              className="svc__card"
              key={s.title}
              data-reveal
              style={{ "--reveal-delay": `${(i % 3) * 0.07}s` }}
            >
              <span className="svc__icon">
                <Icon name={s.icon} size={30} />
              </span>
              <h3 className="svc__card-title">{s.title}</h3>
              <p className="svc__card-body">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
