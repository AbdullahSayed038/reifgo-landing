import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import SlowLoadingNote from "../components/SlowLoadingNote.jsx";
import { useLeadModal } from "../components/LeadModal.jsx";
import { fetchProperty } from "../lib/contentApi.js";
import { APP_WEB_URL } from "../lib/siteLinks.js";
import "./PropertyPage.css";

/**
 * A listing as investors see it, right on the website (Syed, Sept 24): a Sales
 * Agent can open it from a lead or share the link without anyone needing the
 * app. Prices are in the listing's own currency, as the developer set them.
 */

const STATUS = { active: "Available", coming_soon: "Coming soon", sold_out: "Sold out" };

function money(amount, currency = "AED") {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  try {
    return new Intl.NumberFormat(currency === "AED" ? "en-AE" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Math.round(Number(amount)).toLocaleString()}`;
  }
}

const sqft = (n) => (n == null ? null : `${Math.round(Number(n)).toLocaleString()} sq ft`);

function sizeRange(min, max) {
  if (min == null && max == null) return null;
  if (min != null && max != null && Number(min) !== Number(max)) {
    return `${Math.round(min).toLocaleString()}–${Math.round(max).toLocaleString()} sq ft`;
  }
  return sqft(min ?? max);
}

const monthYear = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : null;

const dayMonthYear = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

/** The app's icon names ("mci:swim", "water-outline"), drawn from Iconify. */
function iconUrl(name) {
  const clean = (name ?? "").trim();
  if (!clean) return null;
  return clean.startsWith("mci:")
    ? `https://api.iconify.design/mdi/${clean.slice(4)}.svg?color=%2300556c`
    : `https://api.iconify.design/ion/${clean}.svg?color=%2300556c`;
}

function ListingIcon({ name }) {
  const [broken, setBroken] = useState(false);
  const url = iconUrl(name);
  if (!url || broken) return <span className="lst-icon lst-icon--empty" aria-hidden="true" />;
  return <img className="lst-icon" src={url} alt="" loading="lazy" onError={() => setBroken(true)} />;
}

const cleanName = (s) => (s ?? "").replace(/\s+/g, " ").trim();

export default function PropertyPage() {
  const { id } = useParams();
  const openLead = useLeadModal();
  const [p, setP] = useState(null);
  const [status, setStatus] = useState("loading");
  const [shot, setShot] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStatus("loading");
    setP(null);
    setShot(0);
    fetchProperty(id)
      .then((row) => {
        setP(row);
        setStatus("ready");
      })
      .catch((err) => setStatus(/\(404\)/.test(err.message) ? "missing" : "error"));
  }, [id]);

  useEffect(() => {
    if (!p) return;
    const before = document.title;
    document.title = `${p.name} | REIFGO`;
    return () => {
      document.title = before;
    };
  }, [p]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text: `${p.name} on REIFGO`, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  if (status !== "ready" || !p) {
    return (
      <>
        <Header active="" cta="Invest Now" />
        <main className="lst">
          {status === "loading" ? (
            <div className="section container lst-loading" aria-busy="true">
              <span className="sr-only">Loading the listing…</span>
              <div className="lst-loading__bar lst-loading__bar--title" />
              <div className="lst-loading__block" />
              <SlowLoadingNote />
            </div>
          ) : (
            <div className="section container lst-missing">
              <h1 className="heading h2">
                {status === "missing" ? "This listing isn't available" : "Something went wrong"}
              </h1>
              <p>
                {status === "missing"
                  ? "It may have sold out, been taken down, or the link may be out of date."
                  : "We couldn't load this listing just now. Please try again shortly."}
              </p>
              <button className="btn btn--lg" onClick={() => openLead("contact")}>Talk to REIFGO</button>
            </div>
          )}
        </main>
        <Footer />
      </>
    );
  }

  const currency = p.currency || "AED";
  const images = (p.media ?? []).map((m) => m.url).filter(Boolean);
  const units = p.unit_types ?? [];
  const unitPrices = units.map((u) => u.from_price).filter((v) => v != null).map(Number);
  const fromPrice = unitPrices.length ? Math.min(...unitPrices) : p.min_entry_price;
  const developer = p.developer ?? {};
  const roi = p.roi ?? {};
  const hasRoi = [roi.annual_return, roi.capital_appreciation, roi.rental_yield].some((v) => v != null);
  const amenityGroups = [...new Set((p.amenities ?? []).map((a) => a.group_name || "Amenities"))].map((g) => [
    g,
    p.amenities.filter((a) => (a.group_name || "Amenities") === g),
  ]);
  const rera = typeof p.construction_progress === "number";

  const facts = [
    ["Property type", p.property_type],
    ["Payment plan", p.payment_plan],
    ["Ownership", p.ownership_type],
    ["Completion", monthYear(p.completion_date)],
    ["Handover", p.handover],
    ["Total area", sqft(p.total_area)],
    ["Asset class", p.asset_class],
  ].filter(([, v]) => v);

  const enquire = () => openLead("listing", { property: { id: p.id, name: p.name } });

  return (
    <>
      <Header active="" cta="Invest Now" />
      <main className="lst">
        <header className="lst-head">
          <div className="container">
            <p className="eyebrow lst-head__eyebrow">
              <span>{cleanName(developer.name)}</span>
              {developer.is_verified && <span className="lst-verified">Verified developer</span>}
            </p>
            <h1 className="heading lst-title">{p.name}</h1>
            <p className="lst-where">
              {p.location && <span>{p.location}</span>}
              <span className={`lst-status lst-status--${p.status}`}>{STATUS[p.status] ?? p.status}</span>
            </p>
          </div>
        </header>

        {images.length > 0 && (
          <section className="lst-gallery container" aria-label="Photos">
            <div className="lst-gallery__main">
              <img src={images[shot] ?? images[0]} alt={`${p.name}, photo ${shot + 1} of ${images.length}`} />
            </div>
            {images.length > 1 && (
              <ul className="lst-gallery__thumbs">
                {images.map((src, i) => (
                  <li key={src + i}>
                    <button
                      type="button"
                      className={i === shot ? "is-active" : ""}
                      aria-label={`Show photo ${i + 1}`}
                      aria-current={i === shot}
                      onClick={() => setShot(i)}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="lst-layout container">
          <aside className="lst-aside">
            <div className="lst-card">
              <p className="eyebrow">Starting from</p>
              <p className="lst-price">{money(fromPrice, currency) ?? "Price on request"}</p>
              <p className="lst-price__note">Prices in {currency}, as set by the developer.</p>
              {p.min_entry_price != null && unitPrices.length > 0 && Number(p.min_entry_price) !== Math.min(...unitPrices) && (
                <p className="lst-price__note">Minimum entry {money(p.min_entry_price, currency)}</p>
              )}
              <div className="lst-card__actions">
                <button className="btn" onClick={enquire} disabled={p.status === "sold_out"}>
                  {p.status === "sold_out" ? "Sold out" : "Enquire about this property"}
                </button>
                <button className="btn btn--ghost" onClick={share}>
                  {copied ? "Link copied" : "Share listing"}
                </button>
              </div>
              <a className="arrow-link lst-card__app" href={`${APP_WEB_URL}/property/${p.id}`} target="_blank" rel="noreferrer">
                Open in the REIFGO app
                <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
                  <path d="M9 1l4 4-4 4M13 5H1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </a>
            </div>

            <div className="lst-dev">
              {developer.logo_url ? (
                <img className="lst-dev__logo" src={developer.logo_url} alt="" />
              ) : (
                <span className="lst-dev__logo lst-dev__logo--text" aria-hidden="true">
                  {cleanName(developer.name).slice(0, 2)}
                </span>
              )}
              <div>
                <p className="lst-dev__name">{cleanName(developer.name)}</p>
                {developer.tagline && <p className="lst-dev__tagline">{developer.tagline}</p>}
                <p className="lst-dev__meta">
                  {[
                    developer.years_in_market != null && `${developer.years_in_market} years in market`,
                    developer.total_projects != null && `${developer.total_projects}+ projects`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </aside>

          <div className="lst-main">
            {facts.length > 0 && (
              <section className="lst-block">
                <h2 className="lst-h">At a glance</h2>
                <dl className="lst-facts">
                  {facts.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {p.overview && (
              <section className="lst-block">
                <h2 className="lst-h">Overview</h2>
                {p.overview
                  .split(/\n{2,}/)
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t, i) => (
                    <p className="lst-text" key={i}>{t}</p>
                  ))}
              </section>
            )}

            {hasRoi && (
              <section className="lst-block">
                <h2 className="lst-h">Investment figures</h2>
                <dl className="lst-figures">
                  {roi.annual_return != null && (
                    <div><dt>Annual return</dt><dd>{roi.annual_return}%</dd></div>
                  )}
                  {roi.capital_appreciation != null && (
                    <div><dt>Capital appreciation</dt><dd>{roi.capital_appreciation}%</dd></div>
                  )}
                  {roi.rental_yield != null && (
                    <div><dt>Rental yield</dt><dd>{roi.rental_yield}%</dd></div>
                  )}
                  {roi.exit_horizon && (
                    <div><dt>Exit horizon</dt><dd>{roi.exit_horizon}</dd></div>
                  )}
                </dl>
                <p className="lst-small">Figures are the developer's projections, not a guarantee of returns.</p>
              </section>
            )}

            {rera && (
              <section className="lst-block">
                <h2 className="lst-h">RERA-verified progress</h2>
                <div className="lst-progress" role="img" aria-label={`${p.construction_progress}% built`}>
                  <span style={{ transform: `scaleX(${Math.min(100, Math.max(0, p.construction_progress)) / 100})` }} />
                </div>
                <p className="lst-text">
                  {p.construction_progress}% built
                  {p.progress_verified_at ? `, verified ${dayMonthYear(p.progress_verified_at)}` : ""}.
                  {p.permits?.length ? ` Permits held: ${p.permits.join(", ")}.` : ""}
                </p>
              </section>
            )}

            {units.length > 0 && (
              <section className="lst-block">
                <h2 className="lst-h">Unit types</h2>
                <ul className="lst-units">
                  {units.map((u) => (
                    <li key={u.id}>
                      <span className="lst-units__name">{u.name}</span>
                      <span className="lst-units__size">{sizeRange(u.min_area, u.max_area) ?? ""}</span>
                      <span className="lst-units__price">
                        {u.from_price != null ? `From ${money(u.from_price, currency)}` : "Price on request"}
                      </span>
                      {u.floor_plan_url ? (
                        <a className="lst-units__plan" href={u.floor_plan_url} target="_blank" rel="noreferrer">
                          Floor plan
                        </a>
                      ) : (
                        <span className="lst-units__plan" />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {amenityGroups.length > 0 && (
              <section className="lst-block">
                <h2 className="lst-h">Amenities &amp; facilities</h2>
                {amenityGroups.map(([group, items]) => (
                  <div key={group} className="lst-amenities">
                    {amenityGroups.length > 1 && <h3 className="eyebrow">{group}</h3>}
                    <ul>
                      {items.map((a) => (
                        <li key={a.id}>
                          <ListingIcon name={a.icon} />
                          <span>{a.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {(p.nearby_places ?? []).length > 0 && (
              <section className="lst-block">
                <h2 className="lst-h">Nearby</h2>
                <ul className="lst-nearby">
                  {p.nearby_places.map((n) => (
                    <li key={n.id}>
                      <ListingIcon name={n.icon} />
                      <span className="lst-nearby__name">{n.name}</span>
                      <span className="lst-nearby__time">
                        {[
                          n.travel_minutes != null && `${n.travel_minutes} min ${n.travel_mode === "walk" ? "walk" : "drive"}`,
                          n.distance_km != null && `${n.distance_km} km`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(p.faqs ?? []).length > 0 && (
              <section className="lst-block">
                <h2 className="lst-h">Questions</h2>
                <div className="lst-faqs">
                  {p.faqs.map((f, i) => (
                    <details key={f.id} open={i === 0}>
                      <summary>{f.question}</summary>
                      <p>{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <section className="lst-block lst-cta">
              <h2 className="lst-h">Interested in {p.name}?</h2>
              <p className="lst-text">
                A property consultant can take you through availability, the payment plan and the next steps.
              </p>
              <div className="lst-card__actions lst-cta__actions">
                <button className="btn" onClick={enquire} disabled={p.status === "sold_out"}>
                  {p.status === "sold_out" ? "Sold out" : "Enquire now"}
                </button>
                <Link className="btn btn--ghost" to="/advisor">Ask the AI advisor</Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
