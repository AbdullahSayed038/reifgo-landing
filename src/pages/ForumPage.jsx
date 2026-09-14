import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { fetchSummit, requestInvitation } from "../lib/contentApi.js";
import { initReveal } from "../lib/reveal.js";
import SummitIcon from "../components/SummitIcon.jsx";
import useCarousel from "../lib/useCarousel.js";
import SlowLoadingNote from "../components/SlowLoadingNote.jsx";
import "./ForumPage.css";

const EMPTY_FORM = {
  full_name: "",
  role: "",
  company: "",
  capital: "",
  focus: "",
  message: "",
  email: "",
};

// Figma 198:516 — the three stages of the invitation request.
const STEPS = ["Profile", "Experience", "Verification"];

const CAPITAL_BANDS = [
  "Under $10M",
  "$10M - $100M",
  "$100M - $500M",
  "$500M - $1B",
  "$1B+",
];

const FOCUS_AREAS = ["Residential", "Commercial", "PropTech", "ESG", "Multi-sector"];

// Titles would otherwise eat an initial — "Dr. Elena Rostova" reads as "DE"
// rather than "ER".
const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "miss", "prof", "sir", "dame"]);

// Placeholder shown until a speaker photo is uploaded.
function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ""))
    .filter((w) => w && !HONORIFICS.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Figma 198:283 sets "INVESTMENT" in the regular cut against an extra-bold
// headline, and keeps "INVESTMENT FORUM" together on its own line. The name
// comes from the CMS, so the word is matched rather than hard-coded.
function heroTitle(name) {
  const at = name.search(/investment/i);
  if (at < 0) return name;
  const word = name.slice(at, at + "investment".length);
  return (
    <>
      {name.slice(0, at)}
      <span className="fm-hero__line">
        <span className="fm-hero__light">{word}</span>
        {name.slice(at + word.length)}
      </span>
    </>
  );
}

function Arrow({ flip = false }) {
  return (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M1 7h18M13 1l6 6-6 6" />
    </svg>
  );
}

export default function ForumPage() {
  const [summit, setSummit] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const carousel = useCarousel();

  useEffect(() => {
    fetchSummit()
      .then(setSummit)
      .catch(() =>
        setError("We couldn't load the summit details. Please try again shortly."),
      );
  }, []);

  useEffect(() => {
    if (summit) return initReveal();
  }, [summit]);

  // The track only exists once the summit has loaded.
  useEffect(() => {
    if (summit) carousel.measure();
  }, [summit, carousel.measure]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    // Each stage is its own <form> submit, so the browser's required-field
    // check runs before moving on.
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (sending) return;
    setSending(true);
    setFormError("");

    // The API keeps one free-text note; the structured answers ride at its top
    // so the team sees them first without a schema change.
    const message = [
      form.capital && `Investable capital: ${form.capital}`,
      form.focus && `Primary focus: ${form.focus}`,
      form.message.trim(),
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000);

    try {
      await requestInvitation({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        // Empty optional fields are dropped rather than sent as "", which the
        // API would otherwise store as a present-but-blank value.
        ...(form.company.trim() && { company: form.company.trim() }),
        ...(form.role.trim() && { role: form.role.trim() }),
        ...(message && { message }),
      });
      setSent(true);
      setForm(EMPTY_FORM);
      setStepIndex(0);
    } catch (err) {
      setFormError(err.message);
    }
    setSending(false);
  };

  if (error) {
    return (
      <>
        <Header active="Forum" cta="Invest Now" />
        <main className="section container">
          <p className="fm-error">{error}</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!summit) {
    return (
      <>
        <Header active="Forum" cta="Invest Now" />
        <main className="fm-loading section container" aria-busy="true">
          <span className="sr-only">Loading summit details…</span>
          <div className="fm-loading__bar" />
          <div className="fm-loading__bar fm-loading__bar--short" />
          <SlowLoadingNote />
        </main>
        <Footer />
      </>
    );
  }

  const { stats, highlights, agenda, awards, speakers } = summit;
  const year = summit.year ?? new Date().getFullYear();
  const lastStep = stepIndex === STEPS.length - 1;

  return (
    <>
      <Header active="Forum" cta="Invest Now" />
      <main>
        {/* ---- Hero (Figma 198:267) ---- */}
        <section className="fm-hero">
          <div
            className="fm-hero__media"
            aria-hidden="true"
            style={
              summit.hero_image_url
                ? { backgroundImage: `url(${summit.hero_image_url})` }
                : undefined
            }
          />
          <div className="fm-hero__inner">
            {summit.eyebrow && (
              <p className="fm-hero__eyebrow">
                <span className="fm-hero__rule" aria-hidden="true" />
                {summit.eyebrow}
              </p>
            )}
            <div className="fm-hero__heading">
              <h1 className="fm-hero__title">{heroTitle(summit.name)}</h1>
              {summit.tagline && <p className="fm-hero__sub">{summit.tagline}</p>}
            </div>
            <div className="fm-hero__actions">
              <a className="fm-btn fm-btn--light" href="#request-invitation">
                Request Invitation
              </a>
              {summit.prospectus_url && (
                <a
                  className="fm-btn fm-btn--outline"
                  href={summit.prospectus_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Prospectus
                </a>
              )}
            </div>
          </div>
          {summit.venue && (
            <div className="fm-hero__venue">
              <span className="fm-hero__venue-label">Venue</span>
              <span className="fm-hero__venue-name">{summit.venue}</span>
            </div>
          )}
        </section>

        {/* ---- Highlights + stats (Figma 198:291) ---- */}
        {(highlights.length > 0 || stats.length > 0) && (
          <section className="fm-section fm-highlights">
            <div className="fm-wrap fm-highlights__grid">
              <div className="fm-highlights__copy">
                <div className="fm-head">
                  <p className="fm-eyebrow" data-reveal>
                    Summit Highlights
                  </p>
                  <h2 className="fm-h2 fm-highlights__title" data-reveal>
                    What to Expect
                  </h2>
                </div>
                <ul className="fm-highlights__list">
                  {highlights.map((item) => (
                    <li className="fm-highlight" key={item.id} data-reveal>
                      <span className="fm-highlight__icon" aria-hidden="true">
                        <SummitIcon name={item.icon} size={28} />
                      </span>
                      <div className="fm-highlight__body">
                        <h3 className="fm-highlight__title">{item.title}</h3>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {stats.length > 0 && (
                <div className="fm-stats" data-reveal>
                  {stats.map((s) => (
                    <div className="fm-stat" key={s.id}>
                      <p className="fm-stat__value">{s.title}</p>
                      {s.subtitle && <p className="fm-stat__label">{s.subtitle}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---- Speakers (Figma 198:356) ---- */}
        {speakers.length > 0 && (
          <section className="fm-section fm-speakers">
            <div className="fm-wrap">
              <div className="fm-speakers__top">
                <div className="fm-head">
                  <p className="fm-eyebrow" data-reveal>
                    Speakers
                  </p>
                  <h2 className="fm-h2 fm-h2--tight fm-speakers__title" data-reveal>
                    Voices of Industry Authority
                  </h2>
                </div>
                <div className="fm-speakers__nav">
                  <button
                    type="button"
                    className="fm-round"
                    onClick={() => carousel.step(-1)}
                    disabled={carousel.edges.start}
                    aria-label="Previous speakers"
                  >
                    <Arrow flip />
                  </button>
                  <button
                    type="button"
                    className="fm-round"
                    onClick={() => carousel.step(1)}
                    disabled={carousel.edges.end}
                    aria-label="Next speakers"
                  >
                    <Arrow />
                  </button>
                </div>
              </div>

              <div className="fm-speakers__track" ref={carousel.trackRef}>
                {speakers.map((p) => (
                  <article className="fm-speaker" key={p.id} data-reveal>
                    <div className="fm-speaker__photo">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" loading="lazy" />
                      ) : (
                        <div className="fm-speaker__placeholder" aria-hidden="true">
                          {initials(p.name)}
                        </div>
                      )}
                    </div>
                    <div className="fm-speaker__body">
                      <h3 className="fm-speaker__name">{p.name}</h3>
                      <p className="fm-speaker__role">
                        {[p.role, p.company].filter(Boolean).join(", ")}
                      </p>
                      {p.topic && <p className="fm-speaker__topic">{p.topic}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- Agenda verticals (Figma 198:416) ---- */}
        {agenda.length > 0 && (
          <section className="fm-section fm-agenda">
            <div className="fm-wrap">
              <div className="fm-head fm-agenda__head">
                <p className="fm-eyebrow" data-reveal>
                  Agenda Verticals
                </p>
                <h2 className="fm-h2" data-reveal>
                  A roadmap through the institutional frontier.
                </h2>
              </div>
              <div className="fm-agenda__grid">
                {agenda.map((item) => (
                  <article className="fm-vertical" key={item.id} data-reveal>
                    <span className="fm-vertical__icon" aria-hidden="true">
                      <SummitIcon name={item.icon} size={42} />
                    </span>
                    <h3 className="fm-vertical__title">{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- Awards (Figma 198:451) ---- */}
        {awards.length > 0 && (
          <section className="fm-section fm-awards">
            <div className="fm-awards__wash" aria-hidden="true" />
            <div className="fm-wrap fm-awards__inner">
              <div className="fm-awards__copy">
                <div className="fm-head">
                  <p className="fm-eyebrow fm-eyebrow--dark" data-reveal>
                    Excellence in Craft
                  </p>
                  <h2 className="fm-h2 fm-awards__title" data-reveal>
                    The REIFGO Awards Ceremony
                  </h2>
                  <p className="fm-awards__sub" data-reveal>
                    Recognizing the visionaries who bridge the gap between financial
                    performance and architectural legacy. Join us as we honor the
                    leading developers of {year}.
                  </p>
                </div>
                <ol className="fm-awards__list">
                  {awards.map((item, i) => (
                    <li className="fm-award" key={item.id} data-reveal>
                      <span className="fm-award__num" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="fm-award__body">
                        <h3 className="fm-award__title">{item.title}</h3>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <figure className="fm-awards__media" data-reveal>
                <div className="fm-awards__frame">
                  <img
                    src="/forum-awards.png"
                    alt="Skyline at dusk over the host city of the REIFGO awards ceremony"
                    loading="lazy"
                  />
                </div>
                <figcaption className="fm-awards__badge">
                  <span className="fm-awards__badge-kicker">Coming soon</span>
                  <span className="fm-awards__badge-title">Official {year} Nominees</span>
                </figcaption>
              </figure>
            </div>
          </section>
        )}

        {/* ---- Invitation request (Figma 198:492) ---- */}
        <section className="fm-section fm-invite" id="request-invitation">
          <div className="fm-wrap fm-invite__inner">
            <div className="fm-invite__copy" data-reveal>
              <div className="fm-head">
                <p className="fm-eyebrow">Participation</p>
                <h2 className="fm-invite__title">Secure your seat at the summit.</h2>
              </div>
              <p className="fm-invite__sub">
                Delegates are selected based on their contribution to the global real
                estate ecosystem. Applications are reviewed within 48 hours.
              </p>
              <ul className="fm-invite__points">
                <li>
                  <span className="fm-invite__point-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" />
                      <path d="M8.5 12l2.4 2.4 4.6-4.8" />
                    </svg>
                  </span>
                  Accredited Investors Only
                </li>
                <li>
                  <span className="fm-invite__point-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3.5h12v9H6zM3.5 12.5h17M7 12.5V21M17 12.5V21M4.5 17h15" />
                    </svg>
                  </span>
                  Limited to 500 Global Delegates
                </li>
              </ul>
              {summit.venue && (
                <p className="fm-invite__meta">
                  {summit.venue}
                  {summit.year ? ` · ${summit.year}` : ""}
                </p>
              )}
            </div>

            <div className="fm-invite__card" data-reveal>
              {sent ? (
                <div className="fm-invite__done" role="status">
                  <h3 className="fm-invite__done-title">Request received</h3>
                  <p>
                    Thank you — your request has been logged and our team will be in touch
                    by email.
                  </p>
                  <button className="fm-btn fm-btn--solid" onClick={() => setSent(false)}>
                    Submit another
                  </button>
                </div>
              ) : (
                <>
                  <ol className="fm-steps" aria-label="Request progress">
                    {STEPS.map((label, i) => (
                      <li
                        key={label}
                        className={`fm-step${i <= stepIndex ? " is-active" : ""}`}
                        aria-current={i === stepIndex ? "step" : undefined}
                      >
                        <span className="fm-step__dot">{i + 1}</span>
                        <span className="fm-step__label">{label}</span>
                      </li>
                    ))}
                  </ol>

                  <form className="fm-form" onSubmit={submit}>
                    {stepIndex === 0 && (
                      <>
                        <div className="fm-form__row">
                          <div className="fm-field">
                            <label htmlFor="inv-name">Full name *</label>
                            <input
                              id="inv-name"
                              required
                              maxLength={120}
                              placeholder="Johnathan W. Sterling"
                              value={form.full_name}
                              onChange={set("full_name")}
                              autoComplete="name"
                            />
                          </div>
                          <div className="fm-field">
                            <label htmlFor="inv-role">Institutional role</label>
                            <input
                              id="inv-role"
                              maxLength={120}
                              placeholder="Managing Director"
                              value={form.role}
                              onChange={set("role")}
                              autoComplete="organization-title"
                            />
                          </div>
                        </div>
                        <div className="fm-field">
                          <label htmlFor="inv-company">Organization name</label>
                          <input
                            id="inv-company"
                            maxLength={160}
                            placeholder="London Global Asset Management"
                            value={form.company}
                            onChange={set("company")}
                            autoComplete="organization"
                          />
                        </div>
                        <div className="fm-field">
                          <label htmlFor="inv-capital">AUM / Investable capital</label>
                          <div className="fm-select">
                            <select id="inv-capital" value={form.capital} onChange={set("capital")}>
                              <option value="">Select a range</option>
                              {CAPITAL_BANDS.map((b) => (
                                <option key={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {stepIndex === 1 && (
                      <>
                        <div className="fm-field">
                          <label htmlFor="inv-focus">Primary investment focus</label>
                          <div className="fm-select">
                            <select id="inv-focus" value={form.focus} onChange={set("focus")}>
                              <option value="">Select a focus</option>
                              {FOCUS_AREAS.map((f) => (
                                <option key={f}>{f}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="fm-field">
                          <label htmlFor="inv-message">Recent activity or anything we should know</label>
                          <textarea
                            id="inv-message"
                            rows={5}
                            maxLength={1800}
                            placeholder="Portfolio highlights, markets you are active in, sessions of interest…"
                            value={form.message}
                            onChange={set("message")}
                          />
                        </div>
                      </>
                    )}

                    {lastStep && (
                      <div className="fm-field">
                        <label htmlFor="inv-email">Professional email *</label>
                        <input
                          id="inv-email"
                          type="email"
                          required
                          maxLength={200}
                          placeholder="j.sterling@lgam.co.uk"
                          value={form.email}
                          onChange={set("email")}
                          autoComplete="email"
                        />
                        <p className="fm-field__hint">
                          We confirm every delegate by email before an invitation is issued.
                        </p>
                      </div>
                    )}

                    {formError && (
                      <p className="fm-form__error" role="alert">
                        {formError}
                      </p>
                    )}

                    <div className="fm-form__actions">
                      {stepIndex > 0 && (
                        <button
                          type="button"
                          className="fm-form__back"
                          onClick={() => setStepIndex((i) => i - 1)}
                        >
                          Back
                        </button>
                      )}
                      <button className="fm-btn fm-btn--solid fm-form__submit" disabled={sending}>
                        {lastStep
                          ? sending
                            ? "Sending…"
                            : "Request Invitation"
                          : `Continue to ${STEPS[stepIndex + 1]}`}
                        <Arrow />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
