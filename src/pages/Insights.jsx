import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { fetchCategories, fetchInsights } from "../lib/contentApi.js";
import { initReveal } from "../lib/reveal.js";
import useCarousel from "../lib/useCarousel.js";
import SlowLoadingNote from "../components/SlowLoadingNote.jsx";
import "./Insights.css";

// ~200 wpm on the body, so an article without one still shows something honest.
function readTime(insight) {
  const words = (insight.body ?? insight.excerpt ?? "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function ArrowRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M5.5 1L9 5l-3.5 4M9 5H1"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ flip = false }) {
  return (
    <svg
      width="8"
      height="12"
      viewBox="0 0 8 12"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M1.5 1l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma 198:34 — Insights & Research. */
export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [error, setError] = useState("");
  const [briefingNotice, setBriefingNotice] = useState("");
  const hub = useCarousel();

  useEffect(() => {
    // allSettled: the category filter is a nice-to-have, and losing it must not
    // take the articles down with it.
    Promise.allSettled([fetchInsights(), fetchCategories()]).then(([i, c]) => {
      if (i.status === "fulfilled") setInsights(i.value);
      else setError("We couldn't load the latest research. Please try again shortly.");
      if (c.status === "fulfilled") setCategories(c.value);
    });
  }, []);

  // Re-run the reveal observer once content exists, since the nodes it watches
  // are rendered from the fetch rather than present on mount.
  useEffect(() => {
    if (insights) return initReveal();
  }, [insights, activeCategory]);

  // The spotlight always leads with the newest three; the category filter only
  // narrows the hub, so choosing a category never empties the top of the page.
  const [lead, ...rest] = insights ?? [];
  const spotlightSide = rest.slice(0, 2);

  const hubItems = useMemo(() => {
    if (!insights) return [];
    if (activeCategory === "all") return insights;
    return insights.filter((i) => i.category?.slug === activeCategory);
  }, [insights, activeCategory]);

  // New cards change the track width, so the arrows re-check their edges.
  useEffect(() => {
    hub.measure();
    hub.trackRef.current?.scrollTo({ left: 0 });
  }, [hubItems, hub.measure, hub.trackRef]);

  const loading = insights === null;

  return (
    <>
      <Header active="Insights" cta="Invest Now" />
      <main>
        {/* ---- Hero (198:36) ---- */}
        <section className="ins-hero">
          <div className="ins-hero__media" aria-hidden="true" />
          <div className="ins-hero__inner">
            <p className="ins-hero__eyebrow">
              <span className="ins-hero__rule" aria-hidden="true" />
              Institutional Intelligence
            </p>
            <h1 className="ins-hero__title">
              Insights and
              <span className="ins-hero__light">Research</span>
            </h1>
            <p className="ins-hero__sub">Knowledge is the gateway to Better Investments.</p>
            <div className="ins-hero__actions">
              <a className="ins-btn ins-btn--light" href="#spotlight">
                Read Latest
              </a>
              <a className="ins-btn ins-btn--outline" href="#research-hub">
                Data Terminal
              </a>
            </div>
          </div>
          <a className="ins-hero__scroll" href="#spotlight">
            Scroll to explore
            <span className="ins-hero__scroll-line" aria-hidden="true" />
          </a>
        </section>

        {/* ---- Editorial spotlight (198:59) ---- */}
        <section className="ins-spotlight" id="spotlight">
          <div className="ins-wrap">
            <h2 className="ins-spotlight__label" data-reveal>
              Editorial Spotlight
            </h2>

            {error && <p className="ins-error">{error}</p>}

            {loading && !error && (
              <div className="ins-skeleton" aria-live="polite" aria-busy="true">
                <span className="sr-only">Loading research…</span>
                <div className="ins-skeleton__lead" />
                <div className="ins-skeleton__side">
                  <div className="ins-skeleton__row" />
                  <div className="ins-skeleton__row" />
                </div>
                <SlowLoadingNote />
              </div>
            )}

            {!loading && !error && !lead && (
              <p className="ins-empty">No research has been published yet.</p>
            )}

            {!loading && lead && (
              <div className="ins-spotlight__grid">
                <article className="ins-lead" data-reveal>
                  <Link className="ins-lead__media" to={`/insights/${lead.slug}`} tabIndex={-1}>
                    {lead.cover_url ? (
                      <img src={lead.cover_url} alt="" loading="lazy" />
                    ) : (
                      <div className="ins-placeholder" aria-hidden="true" />
                    )}
                    {lead.category && <span className="ins-tag">{lead.category.name}</span>}
                  </Link>
                  <h3 className="ins-lead__title">
                    <Link to={`/insights/${lead.slug}`}>{lead.title}</Link>
                  </h3>
                  {lead.excerpt && <p className="ins-lead__excerpt">{lead.excerpt}</p>}
                  <Link className="ins-link" to={`/insights/${lead.slug}`}>
                    Full Analysis
                    <ArrowRight />
                  </Link>
                </article>

                <div className="ins-spotlight__side">
                  {spotlightSide.map((item) => (
                    <Link
                      className="ins-side"
                      key={item.id}
                      to={`/insights/${item.slug}`}
                      data-reveal
                    >
                      {item.category && <p className="ins-kicker">{item.category.name}</p>}
                      <h3 className="ins-side__title">{item.title}</h3>
                      {item.excerpt && <p className="ins-side__excerpt">{item.excerpt}</p>}
                      <p className="ins-meta">{readTime(item)} min read</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---- Research hub (198:94) ---- */}
        <section className="ins-hub" id="research-hub">
          <div className="ins-wrap">
            <header className="ins-hub__head" data-reveal>
              <div className="ins-hub__intro">
                <h2 className="ins-hub__title">Research Hub</h2>
                <p className="ins-hub__sub">
                  Deep dives into the specific forces reshaping the physical and digital
                  landscape of institutional real estate.
                </p>
              </div>

              <div className="ins-hub__nav">
                <button
                  type="button"
                  className="ins-round"
                  onClick={() => hub.step(-1)}
                  disabled={hub.edges.start}
                  aria-label="Previous research"
                >
                  <Chevron flip />
                </button>
                <button
                  type="button"
                  className="ins-round"
                  onClick={() => hub.step(1)}
                  disabled={hub.edges.end}
                  aria-label="Next research"
                >
                  <Chevron />
                </button>
              </div>
            </header>

            {categories.length > 0 && (
              <div className="ins-filters" role="group" aria-label="Filter by category">
                <button
                  className={`ins-filter${activeCategory === "all" ? " is-active" : ""}`}
                  aria-pressed={activeCategory === "all"}
                  onClick={() => setActiveCategory("all")}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={`ins-filter${activeCategory === c.slug ? " is-active" : ""}`}
                    aria-pressed={activeCategory === c.slug}
                    onClick={() => setActiveCategory(c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="ins-hub__track" ref={hub.trackRef}>
              {hubItems.map((item) => (
                <Link className="ins-card" key={item.id} to={`/insights/${item.slug}`}>
                  <div className="ins-card__media">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" loading="lazy" />
                    ) : (
                      <div className="ins-placeholder" aria-hidden="true" />
                    )}
                  </div>
                  {item.category && <p className="ins-kicker ins-card__kicker">{item.category.name}</p>}
                  <h3 className="ins-card__title">{item.title}</h3>
                  {item.excerpt && <p className="ins-card__excerpt">{item.excerpt}</p>}
                  <span className="ins-card__link">Explore Insights</span>
                </Link>
              ))}
            </div>

            {!loading && hubItems.length === 0 && (
              <p className="ins-empty">No research published in this category yet.</p>
            )}
          </div>
        </section>

        {/* ---- Strategic briefing (198:143) ---- */}
        <section className="ins-briefing">
          <div className="ins-briefing__grid" aria-hidden="true" />
          <div className="ins-briefing__inner" data-reveal>
            <h2 className="ins-briefing__title">Strategic Briefing</h2>
            <p className="ins-briefing__sub">
              Join 45,000+ industry leaders who receive our weekly analysis on the
              intersection of institutional real estate and the digital future.
            </p>
            <form
              className="ins-briefing__form"
              onSubmit={(e) => {
                e.preventDefault();
                // There's no newsletter endpoint yet. Saying so beats a fake
                // success message that quietly drops every address.
                setBriefingNotice(
                  "Newsletter delivery isn't connected yet — no address has been stored.",
                );
              }}
            >
              <label className="sr-only" htmlFor="briefing-email">
                Your institutional email
              </label>
              <input
                id="briefing-email"
                type="email"
                required
                placeholder="Your institutional email"
                autoComplete="email"
              />
              <button type="submit">Subscribe Now</button>
            </form>
            {briefingNotice && (
              <p className="ins-briefing__notice" role="status">
                {briefingNotice}
              </p>
            )}
            <p className="ins-briefing__legal">
              By subscribing, you agree to our regulatory disclosures.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
