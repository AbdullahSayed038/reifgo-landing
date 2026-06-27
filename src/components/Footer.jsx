import "./Footer.css";

const COLUMNS = [
  { title: "Platform", links: ["Investments", "Developers", "Advisory"] },
  { title: "Company", links: ["About Us", "Investor Relations", "Contact"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
];

const SOCIAL = [
  {
    label: "LinkedIn",
    path: "M4.98 3.5A2 2 0 1 1 2.99 5.5 2 2 0 0 1 4.98 3.5zM3 8.5h4V21H3zM9.5 8.5h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4 0 4.88 2.6 4.88 6V21h-4v-5.4c0-1.3 0-3-1.83-3s-2.1 1.42-2.1 2.9V21h-4z",
  },
  {
    label: "X",
    path: "M3 3h4.6l4 5.4L16.4 3H21l-6.6 8.2L21.4 21h-4.6l-4.4-5.9L7 21H3l7-8.6L3 3z",
  },
  {
    label: "Website",
    circle: true,
  },
];

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr__top container">
        <div className="ftr__brand">
          <span className="ftr__logo">
            <svg
              className="ftr__logo-mark"
              viewBox="0 0 27.8403 34.8564"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path fillRule="evenodd" clipRule="evenodd" d="M4.97202 5.67662L0 8.78631V14.4555L18.6158 25.3058H27.8403V19.0067L4.97202 5.67662Z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M18.4889 29.4462L0 18.6681V24.0808L18.4889 34.8564V29.4462Z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M27.8403 14.7916V8.78631L14.0521 0L8.46265 3.4956L27.8403 14.7916Z" />
            </svg>
            REIFGO
          </span>
          <p className="ftr__about">
            Architectural precision in PropTech. Empowering the global real
            estate ecosystem with verified opportunities and AI-driven
            intelligence.
          </p>
          <div className="ftr__social">
            {SOCIAL.map((s) => (
              <a key={s.label} href="#" aria-label={s.label} className="ftr__social-link">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  {s.circle ? (
                    <g fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
                    </g>
                  ) : (
                    <path fill="currentColor" d={s.path} />
                  )}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <nav className="ftr__cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div className="ftr__col" key={col.title}>
              <h5 className="ftr__col-title">{col.title}</h5>
              {col.links.map((l) => (
                <a key={l} href="#" className="ftr__link">
                  {l}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="ftr__bottom">
        <div className="container ftr__bottom-inner">
          <p className="ftr__tagline">
            Connecting Accredited Developers. Empowering Global Investors.
            Creating Opportunities Worldwide.
          </p>
          <div className="ftr__meta">
            <span>© 2025 REIFGO. All rights reserved. Global Headquarters: London.</span>
            <span className="ftr__cities">
              <b>London</b> <i>|</i> <b>Dubai</b> <i>|</i> <b>New York</b>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
