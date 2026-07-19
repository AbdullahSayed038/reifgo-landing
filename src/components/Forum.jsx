import "./Forum.css";

const ITEMS = [
  {
    n: 1,
    title: "Industry Leaders",
    body: "Keynotes from the visionaries shaping the next decade of urban development.",
  },
  {
    n: 2,
    title: "Expert Panels",
    bullets: [
      "Sustainable urban growth",
      "The role of AI in real estate",
      "Future of property financing",
    ],
  },
  {
    n: 3,
    title: "Networking",
    body: "High-value connections with peers and decision-makers in an exclusive setting.",
  },
  {
    n: 4,
    title: "Awards Ceremony",
    body: "Recognizing excellence in development, innovation, and sustainability.",
  },
];

export default function Forum() {
  return (
    <section className="forum section">
      <div className="forum__inner container">
        <header className="forum__head" data-reveal>
          <p className="eyebrow">Flagship Event</p>
          <h2 className="heading h2 forum__title">
            The Global Real Estate Investment Forum 2025
          </h2>
        </header>

        <div className="forum__grid">
          <div className="forum__list" data-reveal>
            <h3 className="forum__list-title">What to Expect</h3>
            <ol className="forum__items">
              {ITEMS.map((it) => (
                <li className="forum__item" key={it.n}>
                  <span className="forum__num">{it.n}</span>
                  <div className="forum__item-body">
                    <h4 className="forum__item-title">{it.title}</h4>
                    {it.body && <p>{it.body}</p>}
                    {it.bullets && (
                      <ul className="forum__bullets">
                        {it.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="forum__media" data-reveal style={{ "--reveal-delay": "0.12s" }}>
            <img src="/forum-stage-main.jpg" alt="Delegates networking at the REIFGO investment forum" />
            <div className="forum__caption">
              <p className="forum__caption-kicker">Main Stage</p>
              <p className="forum__caption-title">The Future of Urban Living</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
