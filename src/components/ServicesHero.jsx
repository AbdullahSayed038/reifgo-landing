import "./ServicesHero.css";

export default function ServicesHero() {
  return (
    <section className="shero">
      <img className="shero__bg" src="/services-hero-villa.jpg" alt="Modern hillside villa overlooking the city at sunset" />
      <span className="shero__scrim" aria-hidden="true" />

      <div className="shero__inner container">
        <div className="shero__content" data-reveal>
          <span className="shero__eyebrow">Structural Expertise</span>
          <h1 className="shero__title">
            Our Direction
            <br />
            (What We Do)
          </h1>
          <p className="shero__lead">
            Strategic frameworks for global real estate growth, connecting
            accredited developers and institutional investors through a synergy
            of technology, events, and advisory.
          </p>
          <div className="shero__actions">
            <button className="btn btn--lg">Explore Services</button>
            <button className="btn btn--lg btn--ghost">Partner With Us</button>
          </div>
        </div>
      </div>
    </section>
  );
}
