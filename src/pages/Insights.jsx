import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { fetchCategories, fetchInsights } from "../lib/contentApi.js";
import { initReveal } from "../lib/reveal.js";
import "./Insights.css";

// ~200 wpm on the body, so an article without one still shows something honest.
function readTime(insight) {
  const words = (insight.body ?? insight.excerpt ?? "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [error, setError] = useState("");
  const [briefingNotice, setBriefingNotice] = useState("");

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

  const visible = useMemo(() => {
    if (!insights) return [];
    if (activeCategory === "all") return insights;
    return insights.filter((i) => i.category?.slug === activeCategory);
  }, [insights, activeCategory]);

  // The design leads with one large article and stacks two beside it. The API
  // already returns primary-first, so the spotlight is simply the head of the
  // list rather than a separate flag to keep in sync.
  const [lead, ...rest] = visible;
  const spotlightSide = rest.slice(0, 2);
  const remainder = rest.slice(2);

  const loading = insights === null;

  return (
    <>
      <Header active="Insights" cta="Invest Now" />
      <main>
        <section className="ins-hero">
          <div className="ins-hero__media" aria-hidden="true" />
          <div className="ins-hero__inner container">
            <p className="eyebrow ins-hero__eyebrow">Institutional Intelligence</p>
            <h1 className="heading ins-hero__title">
              Insights and
              <br />
              Research
            </h1>
            <p className="ins-hero__sub">Knowledge is the gateway to better investments.</p>
            <div className="ins-hero__actions">
              <a className="btn btn--lg" href="#spotlight">
                Read Latest
              </a>
              <a className="btn btn--lg btn--ghost-light" href="#research-hub">
                Data Terminal
              </a>
            </div>
          </div>
        </section>

        <section className="section ins-spotlight" id="spotlight">
          <div className="container">
            <p className="eyebrow" data-reveal>
              Editorial Spotlight
            </p>

            {error && <p className="ins-error">{error}</p>}

            {loading && !error && (
              <div className="ins-skeleton" aria-live="polite" aria-busy="true">
                <span className="sr-only">Loading research…</span>
                <div className="ins-skeleton__lead" />
                <div className="ins-skeleton__side">
                  <div className="ins-skeleton__row" />
                  <div className="ins-skeleton__row" />
                </div>
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <p className="ins-empty">No research published in this category yet.</p>
            )}

            {!loading && lead && (
              <div className="ins-spotlight__grid">
                <article className="ins-lead" data-reveal>
                  <div className="ins-lead__media">
                    {lead.cover_url ? (
                      <img src={lead.cover_url} alt="" loading="lazy" />
                    ) : (
                      <div className="ins-lead__placeholder" aria-hidden="true" />
                    )}
                    {lead.category && (
                      <span className="ins-tag ins-tag--onmedia">{lead.category.name}</span>
                    )}
                  </div>
                  <h2 className="heading ins-lead__title">{lead.title}</h2>
                  {lead.excerpt && <p className="ins-lead__excerpt">{lead.excerpt}</p>}
                  <a className="arrow-link" href={`#article-${lead.slug}`}>
                    Full Analysis
                    <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
                      <path
                        d="M9 1l4 4-4 4M13 5H1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </a>
                </article>

                <div className="ins-spotlight__side">
                  {spotlightSide.map((item) => (
                    <article className="ins-side" key={item.id} data-reveal>
                      {item.category && <p className="ins-kicker">{item.category.name}</p>}
                      <h3 className="heading ins-side__title">{item.title}</h3>
                      {item.excerpt && <p className="ins-side__excerpt">{item.excerpt}</p>}
                      <p className="ins-meta">{readTime(item)} min read</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section ins-hub" id="research-hub">
          <div className="container">
            <header className="ins-hub__head" data-reveal>
              <div>
                <h2 className="heading h2">Research Hub</h2>
                <p className="ins-hub__sub">
                  Deep dives into the specific forces reshaping the physical and digital
                  landscape of institutional real estate.
                </p>
              </div>

              {categories.length > 0 && (
                <div className="ins-filters" role="group" aria-label="Filter by category">
                  <button
                    className={`ins-filter${activeCategory === "all" ? " is-active" : ""}`}
                    onClick={() => setActiveCategory("all")}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={`ins-filter${activeCategory === c.slug ? " is-active" : ""}`}
                      onClick={() => setActiveCategory(c.slug)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </header>

            <div className="ins-hub__grid">
              {remainder.map((item) => (
                <article className="ins-card" key={item.id} data-reveal id={`article-${item.slug}`}>
                  <div className="ins-card__media">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" loading="lazy" />
                    ) : (
                      <div className="ins-card__placeholder" aria-hidden="true" />
                    )}
                  </div>
                  <div className="ins-card__body">
                    {item.category && <p className="ins-kicker">{item.category.name}</p>}
                    <h3 className="heading ins-card__title">{item.title}</h3>
                    {item.excerpt && <p className="ins-card__excerpt">{item.excerpt}</p>}
                    <div className="ins-card__foot">
                      <span className="ins-meta">
                        {fmtDate(item.published_at ?? item.created_at)}
                      </span>
                      <span className="arrow-link">
                        Explore Insights
                        <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
                          <path
                            d="M9 1l4 4-4 4M13 5H1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!loading && remainder.length === 0 && visible.length > 0 && (
              <p className="ins-empty">
                Everything published in this category is featured above.
              </p>
            )}
          </div>
        </section>

        <section className="ins-briefing">
          <div className="container ins-briefing__inner" data-reveal>
            <h2 className="heading ins-briefing__title">Strategic Briefing</h2>
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
                placeholder="YOUR INSTITUTIONAL EMAIL"
                autoComplete="email"
              />
              <button className="btn btn--lg" type="submit">
                Subscribe Now
              </button>
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
