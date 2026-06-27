import Icon from "./Icon.jsx";
import "./Research.css";

const REPORTS = [
  {
    icon: "researchTrends",
    title: "Global market trends and analysis",
    body: "Quarterly deep-dives into regional growth and volatility.",
  },
  {
    icon: "researchInterviews",
    title: "Developer interviews and profiles",
    body: "Conversations with the minds behind iconic projects.",
  },
  {
    icon: "researchGuides",
    title: "Investment guides and best practices",
    body: "Essential resources for cross-border asset management.",
  },
  {
    icon: "researchUpdates",
    title: "Project updates and announcements",
    body: "Breaking news from our developer network globally.",
  },
];

export default function Research() {
  return (
    <section className="rsh section" style={{ background: "var(--surface-soft)" }}>
      <div className="rsh__inner container">
        <header className="rsh__head" data-reveal>
          <div>
            <p className="eyebrow rsh__eyebrow">Insights</p>
            <h2 className="rsh__title">Research &amp; Market Intelligence</h2>
          </div>
          <a href="#" className="arrow-link">
            View All Reports
            <Icon name="arrowRight" size={14} />
          </a>
        </header>

        <ul className="rsh__grid">
          {REPORTS.map((r, i) => (
            <li
              className="rsh__card"
              key={r.title}
              data-reveal
              style={{ "--reveal-delay": `${i * 0.07}s` }}
            >
              <span className="rsh__tile">
                <Icon name={r.icon} size={28} />
              </span>
              <h4 className="rsh__card-title">{r.title}</h4>
              <p className="rsh__card-body">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
