import { useState } from "react";
import LeadModal from "./LeadModal.jsx";
import "./FinalCta.css";

export default function FinalCta() {
  // Which lead form is open: "join_network", "advisory_request", or null.
  const [intent, setIntent] = useState(null);

  return (
    <section className="cta section">
      {/* Decorative fanning lines (matches the Figma background SVG):
          three diagonals converging toward the top-right corner. */}
      <svg
        className="cta__deco"
        viewBox="0 0 640 524"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="xMaxYMid slice"
      >
        <g stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <path d="M0 524L640 0" />
          <path d="M128 524L640 104.8" />
          <path d="M256 524L640 209.6" />
        </g>
      </svg>

      <div className="cta__inner container" data-reveal>
        <h2 className="cta__title heading">Architect Your Portfolio.</h2>
        <div className="cta__actions">
          <button className="btn cta__primary" onClick={() => setIntent("join_network")}>
            Join the Network
          </button>
          <button className="btn btn--ghost-light" onClick={() => setIntent("advisory_request")}>
            Request Advisory
          </button>
        </div>
      </div>

      {intent && <LeadModal intent={intent} onClose={() => setIntent(null)} />}
    </section>
  );
}
