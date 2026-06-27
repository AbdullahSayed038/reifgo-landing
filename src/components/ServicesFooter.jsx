import Icon from "./Icon.jsx";
import "./ServicesFooter.css";

const SOCIAL = [
  {
    label: "LinkedIn",
    path: "M4.98 3.5A2 2 0 1 1 2.99 5.5 2 2 0 0 1 4.98 3.5zM3 8.5h4V21H3zM9.5 8.5h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4 0 4.88 2.6 4.88 6V21h-4v-5.4c0-1.3 0-3-1.83-3s-2.1 1.42-2.1 2.9V21h-4z",
  },
  {
    label: "X",
    path: "M3 3h4.6l4 5.4L16.4 3H21l-6.6 8.2L21.4 21h-4.6l-4.4-5.9L7 21H3l7-8.6L3 3z",
  },
  { label: "Website", circle: true },
];

export default function ServicesFooter() {
  return (
    <footer className="sftr">
      <div className="sftr__inner container">
        <div className="sftr__cols">
          <div className="sftr__brand">
            <span className="sftr__logo">
              <svg
                className="sftr__logo-mark"
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
            <p className="sftr__about">
              Connecting the world's most ambitious developers with institutional
              capital through rigorous data and strategic frameworks.
            </p>
            <div className="sftr__social">
              {SOCIAL.map((s) => (
                <a key={s.label} href="#" aria-label={s.label} className="sftr__social-link">
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

          <div className="sftr__col sftr__col--platform">
            <h6 className="sftr__col-title">Platform</h6>
            <a href="#" className="sftr__link">About Us</a>
            <a href="#" className="sftr__link">Services</a>
            <a href="#" className="sftr__link">Insights</a>
          </div>

          <div className="sftr__col sftr__col--legal">
            <h6 className="sftr__col-title">Legal</h6>
            <a href="#" className="sftr__link">Privacy Policy</a>
            <a href="#" className="sftr__link">Terms of Service</a>
            <a href="#" className="sftr__link">Disclaimers</a>
          </div>

          <div className="sftr__news">
            <h6 className="sftr__col-title">Newsletter</h6>
            <p className="sftr__news-text">
              Strategic market updates delivered to your inbox.
            </p>
            <form className="sftr__form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                className="sftr__input"
                placeholder="Email Address"
                aria-label="Email Address"
              />
              <button type="submit" className="sftr__send" aria-label="Subscribe">
                <Icon name="arrowRight" size={15} />
              </button>
            </form>
          </div>
        </div>

        <div className="sftr__bottom">
          <p className="sftr__copy">
            © 2024 REIFGO Ltd. Registered in England &amp; Wales. London
            Headquarters.
          </p>
          <div className="sftr__legal-links">
            <a href="#" className="sftr__link">Cookies</a>
            <a href="#" className="sftr__link">Investment Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
