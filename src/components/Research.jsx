import Icon from "./Icon.jsx";
import { readPublishedWebsiteInsights } from "../lib/demoStore.js";
import "./Research.css";

// Fallback content, shown until the CMS has published its own insights.
const DEFAULT_REPORTS = [
  {
    image: "/insight-markets.jpg",
    title: "Global market trends and analysis",
    body: "Quarterly deep-dives into regional growth and volatility.",
  },
  {
    image: "/insight-interviews.jpg",
    title: "Developer interviews and profiles",
    body: "Conversations with the minds behind iconic projects.",
  },
  {
    image: "/insight-guides.jpg",
    title: "Investment guides and best practices",
    body: "Essential resources for cross-border asset management.",
  },
  {
    image: "/insight-updates.jpg",
    title: "Project updates and announcements",
    body: "Breaking news from our developer network globally.",
  },
];

// Thumbnail per CMS category when an insight has no cover image of its own.
const CATEGORY_IMAGES = {
  "Market Report": "/insight-markets.jpg",
  Interview: "/insight-interviews.jpg",
  Guide: "/insight-guides.jpg",
  Announcement: "/insight-updates.jpg",
};

// This section is CMS-managed: insights published to the "website"
// channel in the admin dashboard render here (via the shared demo store
// for now; via the public API once the backend is live).
function loadReports() {
  const cms = readPublishedWebsiteInsights();
  if (!cms || cms.length === 0) return DEFAULT_REPORTS;
  return cms.slice(0, 4).map((i) => ({
    image: i.cover_url || CATEGORY_IMAGES[i.category] || "/insight-markets.jpg",
    title: i.title,
    body: i.excerpt ?? "",
  }));
}

export default function Research() {
  const reports = loadReports();

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
          {reports.map((r, i) => (
            <li
              className="rsh__card"
              key={r.title}
              data-reveal
              style={{ "--reveal-delay": `${i * 0.07}s` }}
            >
              <span className="rsh__thumb">
                <img src={r.image} alt="" loading="lazy" />
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
