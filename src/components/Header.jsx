import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { MobileBurger, MobileDrawer } from "./MobileNavDrawer.jsx";
import "./Header.css";

const LINKS = [
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
