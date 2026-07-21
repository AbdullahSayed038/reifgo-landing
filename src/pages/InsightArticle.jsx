import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { fetchInsight } from "../lib/contentApi.js";
import { initReveal } from "../lib/reveal.js";
import "./InsightArticle.css";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

export default function InsightArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  // "missing" is distinct from a transport failure: an unpublished or
  // website-hidden article 404s by design, and telling someone to "try again"
  // for something that will never load is worse than saying it isn't there.
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    setArticle(null);
    fetchInsight(slug)
      .then((a) => {
        setArticle(a);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus(/\(404\)/.test(err.message) ? "missing" : "error");
      });
  }, [slug]);

  useEffect(() => {
    if (article) return initReveal();
  }, [article]);

  const paragraphs = (article?.body ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const readTime = Math.max(
    1,
    Math.round((article?.body ?? article?.excerpt ?? "").trim().split(/\s+/).length / 200),
  );

  return (
    <>
      <Header active="Insights" cta="Invest Now" />
      <main className="art">
        {status === "loading" && (
          <div className="section container art-loading" aria-busy="true">
            <span className="sr-only">Loading article…</span>
            <div className="art-loading__bar art-loading__bar--title" />
            <div className="art-loading__bar" />
            <div className="art-loading__bar art-loading__bar--short" />
          </div>
        )}

        {status === "missing" && (
          <div className="section container art-missing">
            <h1 className="heading h2">We couldn't find that article</h1>
            <p>
              It may have been unpublished, or the link may be out of date.
            </p>
            <Link className="btn btn--lg" to="/insights">
              Back to Insights
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="section container art-missing">
            <h1 className="heading h2">Something went wrong</h1>
            <p>We couldn't load this article just now. Please try again shortly.</p>
            <Link className="btn btn--lg btn--ghost" to="/insights">
              Back to Insights
            </Link>
          </div>
        )}

        {status === "ready" && article && (
          <article>
            <header className="art-head">
              <div className="container">
                <nav className="art-crumbs" aria-label="Breadcrumb">
                  <Link to="/insights">Insights</Link>
                  <span aria-hidden="true">/</span>
                  <span>{article.category?.name ?? "Research"}</span>
                </nav>
                <h1 className="heading art-title">{article.title}</h1>
                {article.excerpt && <p className="art-standfirst">{article.excerpt}</p>}
                <div className="art-meta">
                  {article.author_name && <span>{article.author_name}</span>}
                  <span>{fmtDate(article.published_at ?? article.created_at)}</span>
                  <span>{readTime} min read</span>
                </div>
              </div>
            </header>

            {article.cover_url && (
              <div className="art-cover container" data-reveal>
                <img src={article.cover_url} alt="" />
              </div>
            )}

            <div className="art-body container">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                // A published article with no body isn't an error state — the
                // excerpt is still worth showing rather than a blank column.
                <p className="art-body__empty">
                  The full text of this piece hasn't been published yet.
                </p>
              )}
            </div>

            <div className="container art-foot">
              <Link className="arrow-link" to="/insights">
                <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
                  <path
                    d="M5 1L1 5l4 4M1 5h12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                All Insights
              </Link>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </>
  );
}
