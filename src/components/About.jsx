import Icon from "./Icon.jsx";
import "./About.css";

const VALUES = [
  { icon: "trust", title: "Trust", body: "Integrity is at the heart of everything we do." },
  { icon: "quality", title: "Quality", body: "We curate only the finest opportunities for our network." },
  { icon: "innovation", title: "Innovation", body: "Leveraging cutting-edge technology for better outcomes." },
  { icon: "globalPerspective", title: "Global Perspective", body: "Unlocking possibilities across borders and continents." },
];

export default function About() {
  return (
    <section className="about section" style={{ background: "var(--surface)" }}>
      <div className="about__inner container">
        <div className="about__intro">
          <div className="about__lead-col" data-reveal>
            <p className="eyebrow">Vision &amp; Mission</p>
            <h2 className="heading about__title">
              Architecting the Global Real Estate Nexus
            </h2>
          </div>

          <div className="about__statements" data-reveal style={{ "--reveal-delay": "0.1s" }}>
            <div className="about__statement about__statement--primary">
              <p className="about__label">Our Vision</p>
              <p>
                To make global real estate investment more accessible,
                transparent, and rewarding for investors and developers alike.
              </p>
            </div>
            <div className="about__statement about__statement--soft">
              <p className="about__label">Our Mission</p>
              <p>
                To create a reliable ecosystem where technology and real estate
                meet, empowering our community to build diverse and sustainable
                portfolios.
              </p>
            </div>
          </div>
        </div>

        <ul className="about__values">
          {VALUES.map((v, i) => (
            <li
              className="about__card"
              key={v.title}
              data-reveal
              style={{ "--reveal-delay": `${i * 0.07}s` }}
            >
              <span className="about__icon">
                <Icon name={v.icon} size={26} />
              </span>
              <h3 className="about__card-title">{v.title}</h3>
              <p className="about__card-body">{v.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
