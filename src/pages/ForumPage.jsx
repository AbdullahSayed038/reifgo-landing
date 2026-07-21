import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { fetchSummit, requestInvitation } from "../lib/contentApi.js";
import { initReveal } from "../lib/reveal.js";
import SummitIcon from "../components/SummitIcon.jsx";
import "./ForumPage.css";

const EMPTY_FORM = { full_name: "", email: "", company: "", role: "", message: "" };

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

export default function ForumPage() {
  const [summit, setSummit] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setFormError("");
    try {
      await requestInvitation({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        // Empty optional fields are dropped rather than sent as "", which the
        // API would otherwise store as a present-but-blank value.
        ...(form.company.trim() && { company: form.company.trim() }),
        ...(form.role.trim() && { role: form.role.trim() }),
        ...(form.message.trim() && { message: form.message.trim() }),
      });
      setSent(true);
      setForm(EMPTY_FORM);
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
        </main>
        <Footer />
      </>
    );
  }

  const { stats, highlights, agenda, awards, speakers } = summit;

  return (
    <>
      <Header active="Forum" cta="Invest Now" />
      <main>
        {/* ---- Hero ---- */}
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
          <div className="fm-hero__inner container">
            {summit.eyebrow && (
              <p className="fm-hero__eyebrow">
                <span className="fm-hero__rule" aria-hidden="true" />
                {summit.eyebrow}
              </p>
            )}
            <h1 className="heading fm-hero__title">{summit.name}</h1>
            {summit.tagline && <p className="fm-hero__sub">{summit.tagline}</p>}
            <div className="fm-hero__actions">
              <a className="btn btn--lg" href="#request-invitation">
                Request Invitation
              </a>
              {summit.prospectus_url && (
                <a
                  className="btn btn--lg btn--ghost-dark"
                  href={summit.prospectus_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Prospectus
                </a>
              )}
            </div>
            {summit.venue && (
              <div className="fm-hero__venue">
                <span className="fm-hero__venue-label">Venue</span>
                <span className="fm-hero__venue-name">{summit.venue}</span>
              </div>
            )}
          </div>
        </section>

        {/* ---- Highlights + stats ---- */}
        {(highlights.length > 0 || stats.length > 0) && (
          <section className="section fm-highlights">
            <div className="container fm-highlights__grid">
              <div>
                <p className="eyebrow" data-reveal>
                  Summit Highlights
                </p>
                <h2 className="heading h2 fm-highlights__title" data-reveal>
                  What to Expect
                </h2>
                <ul className="fm-highlights__list">
                  {highlights.map((item) => (
                    <li className="fm-highlight" key={item.id} data-reveal>
                      <span className="fm-highlight__icon" aria-hidden="true">
                        <SummitIcon name={item.icon} />
                      </span>
                      <div>
                        <h3 className="heading fm-highlight__title">{item.title}</h3>
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

        {/* ---- Speakers ---- */}
        {speakers.length > 0 && (
          <section className="section fm-speakers">
            <div className="container">
              <p className="eyebrow" data-reveal>
                Speakers
              </p>
              <h2 className="heading h2 fm-speakers__title" data-reveal>
                Voices of Industry Authority
              </h2>
              <div className="fm-speakers__grid">
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
                    <h3 className="heading fm-speaker__name">{p.name}</h3>
                    <p className="fm-speaker__role">
                      {[p.role, p.company].filter(Boolean).join(", ")}
                    </p>
                    {p.topic && <p className="fm-speaker__topic">{p.topic}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- Agenda verticals ---- */}
        {agenda.length > 0 && (
          <section className="section fm-agenda">
            <div className="container">
              <p className="eyebrow" data-reveal>
                Agenda Verticals
              </p>
              <h2 className="heading h2 fm-agenda__title" data-reveal>
                A roadmap through the institutional frontier.
              </h2>
              <div className="fm-agenda__grid">
                {agenda.map((item) => (
                  <article className="fm-vertical" key={item.id} data-reveal>
                    <span className="fm-vertical__icon" aria-hidden="true">
                      <SummitIcon name={item.icon} />
                    </span>
                    <h3 className="heading fm-vertical__title">{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- Awards ---- */}
        {awards.length > 0 && (
          <section className="section fm-awards">
            <div className="container">
              <p className="eyebrow fm-awards__eyebrow" data-reveal>
                The REIFGO Awards
              </p>
              <h2 className="heading h2 fm-awards__title" data-reveal>
                Recognising excellence in craft.
              </h2>
              <div className="fm-awards__grid">
                {awards.map((item) => (
                  <article className="fm-award" key={item.id} data-reveal>
                    <h3 className="heading fm-award__title">{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- Invitation request ---- */}
        <section className="section fm-invite" id="request-invitation">
          <div className="container fm-invite__inner">
            <div className="fm-invite__copy" data-reveal>
              <p className="eyebrow">Invitation Request</p>
              <h2 className="heading h2 fm-invite__title">Attendance is by invitation.</h2>
              <p className="fm-invite__sub">
                Tell us who you are and how you invest. Our team reviews every request
                and responds with the details.
              </p>
              {summit.venue && (
                <p className="fm-invite__meta">
                  {summit.venue}
                  {summit.year ? ` · ${summit.year}` : ""}
                </p>
              )}
            </div>

            {sent ? (
              <div className="fm-invite__done" role="status" data-reveal>
                <h3 className="heading fm-invite__done-title">Request received</h3>
                <p>
                  Thank you — your request has been logged and our team will be in touch
                  by email.
                </p>
                <button className="btn btn--lg btn--ghost" onClick={() => setSent(false)}>
                  Submit another
                </button>
              </div>
            ) : (
              <form className="fm-form" onSubmit={submit} data-reveal>
                <div className="fm-field">
                  <label htmlFor="inv-name">Full name *</label>
                  <input
                    id="inv-name"
                    required
                    maxLength={120}
                    value={form.full_name}
                    onChange={set("full_name")}
                    autoComplete="name"
                  />
                </div>
                <div className="fm-field">
                  <label htmlFor="inv-email">Email *</label>
                  <input
                    id="inv-email"
                    type="email"
                    required
                    maxLength={200}
                    value={form.email}
                    onChange={set("email")}
                    autoComplete="email"
                  />
                </div>
                <div className="fm-field">
                  <label htmlFor="inv-company">Company</label>
                  <input
                    id="inv-company"
                    maxLength={160}
                    value={form.company}
                    onChange={set("company")}
                    autoComplete="organization"
                  />
                </div>
                <div className="fm-field">
                  <label htmlFor="inv-role">Role</label>
                  <input
                    id="inv-role"
                    maxLength={120}
                    value={form.role}
                    onChange={set("role")}
                    autoComplete="organization-title"
                  />
                </div>
                <div className="fm-field fm-field--wide">
                  <label htmlFor="inv-message">Anything we should know?</label>
                  <textarea
                    id="inv-message"
                    rows={4}
                    maxLength={2000}
                    value={form.message}
                    onChange={set("message")}
                  />
                </div>

                {formError && (
                  <p className="fm-form__error" role="alert">
                    {formError}
                  </p>
                )}

                <button className="btn btn--lg fm-form__submit" disabled={sending}>
                  {sending ? "Sending…" : "Request Invitation"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
