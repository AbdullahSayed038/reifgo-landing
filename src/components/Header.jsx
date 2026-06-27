import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import "./Header.css";

const LINKS = [
  { label: "Platform", to: "/" },
  { label: "Services", to: "/services" },
  { label: "AI Advisor", to: "/advisor" },
  { label: "Insights", to: "/" },
  { label: "Forum", to: "/" },
];

export default function Header({ active = "Platform", cta = "Invest Now" }) {
  return (
    <header className="hdr">
      <div className="hdr__inner container">
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
  );
}
