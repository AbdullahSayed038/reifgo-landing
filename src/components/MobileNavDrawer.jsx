import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

// Shared mobile hamburger button + off-canvas drawer, used by both the
// marketing header and the AI-advisor app header so the interaction is
// identical everywhere. Rendered as a SIBLING of <header>, never nested
// inside it — the header's `backdrop-filter` creates a containing block for
// `position: fixed` descendants, which would otherwise trap the drawer
// inside the header's own (short) box instead of covering the viewport.
export function MobileBurger({ onOpen }) {
  return (
    <button className="hdr__burger" aria-label="Open menu" onClick={onOpen}>
      <span />
      <span />
      <span />
    </button>
  );
}

export function MobileDrawer({ open, onClose, links, active, cta }) {
  return (
    <div className={`hdr__drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="hdr__scrim" onClick={onClose} />
      <aside className="hdr__panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="hdr__panel-top">
          <Logo className="hdr__wordmark" />
          <button className="hdr__close" aria-label="Close menu" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="hdr__drawer-nav" aria-label="Mobile">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={onClose}
              className={`hdr__drawer-link${l.label === active ? " is-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {cta && (
          <button className="btn hdr__drawer-cta" onClick={onClose}>
            {cta}
          </button>
        )}
      </aside>
    </div>
  );
}
