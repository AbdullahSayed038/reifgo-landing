import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { MobileBurger, MobileDrawer } from "./MobileNavDrawer.jsx";
import "./Header.css";

// Single source of truth for site navigation — AdvisorHeader imports this too,
// so the bar reads identically on the marketing pages and inside the advisor
// rather than swapping to a separate set of labels.
export const LINKS = [
  { label: "Platform", to: "/" },
  { label: "Services", to: "/services" },
  { label: "AI Advisor", to: "/advisor" },
  { label: "Insights", to: "/insights" },
  { label: "Forum", to: "/forum" },
];

export default function Header({ active = "Platform", cta = "Invest Now" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="hdr">
        <div className="hdr__inner container">
          <MobileBurger onOpen={() => setOpen(true)} />

          <Link to="/" className="hdr__logo" aria-label="REIFGO home">
            <Logo className="hdr__wordmark" />
          </Link>

          <nav className="hdr__nav" aria-label="Primary">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className={`hdr__link${l.label === active ? " is-active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <button className="btn hdr__cta">{cta}</button>
        </div>
      </header>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        links={LINKS}
        active={active}
        cta={cta}
      />
    </>
  );
}
