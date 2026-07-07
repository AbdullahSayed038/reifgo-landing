import { lazy, Suspense, useState } from "react";
import Icon from "./Icon.jsx";
import "./ChatWidget.css";

// The panel (and everything it pulls in) only loads on first open, so the
// widget adds nothing to initial page load beyond this small launcher.
const ChatWidgetPanel = lazy(() => import("./ChatWidgetPanel.jsx"));

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function toggle() {
    setOpen((v) => !v);
    setLoaded(true);
  }

  return (
    <div className="cw">
      {loaded && (
        <Suspense fallback={null}>
          <ChatWidgetPanel open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      <button
        type="button"
        className="cw__launcher"
        aria-label={open ? "Close REIFGO assistant" : "Ask REIFGO assistant"}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="cw__launcher-icon" data-open={open}>
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <Icon name="chat" size={22} />
          )}
        </span>
      </button>
    </div>
  );
}
