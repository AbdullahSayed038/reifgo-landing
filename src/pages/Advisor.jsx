import { useEffect, useState } from "react";
import AdvisorHeader from "../components/AdvisorHeader.jsx";
import AdvisorSidebar from "../components/AdvisorSidebar.jsx";
import AdvisorChat from "../components/AdvisorChat.jsx";
import AdvisorRail from "../components/AdvisorRail.jsx";
import AdvisorFooter from "../components/AdvisorFooter.jsx";
import { initReveal } from "../lib/reveal.js";
import "./Advisor.css";

function ChevronIcon({ up }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={up ? "M3 10l5-5 5 5" : "M3 6l5 5 5-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Advisor() {
  useEffect(() => initReveal(), []);

  // On mobile the workspace sidebar (profile + AI Chat/Market Trends/...) is
  // hidden behind the header's account icon instead of sitting inline above
  // the conversation. Desktop is unaffected — the sidebar stays inline there.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On mobile the chat fills the screen like a normal chat app; Market Pulse
  // (the right rail on desktop) becomes a bottom sheet toggled by an arrow
  // handle instead of sitting inline and forcing a long page scroll.
  const [railOpen, setRailOpen] = useState(false);

  return (
    <div className="adp">
      <AdvisorHeader onAccountClick={() => setSidebarOpen(true)} />
      <div className="adp__body">
        {sidebarOpen && <div className="ads__scrim" onClick={() => setSidebarOpen(false)} />}
        <AdvisorSidebar
          className={sidebarOpen ? "is-open" : ""}
          onClose={() => setSidebarOpen(false)}
          onNavigate={() => setSidebarOpen(false)}
        />
        <AdvisorChat />
        {railOpen && <div className="arail__scrim" onClick={() => setRailOpen(false)} />}
        <AdvisorRail className={railOpen ? "is-open" : ""} />
        <button
          className="arail__toggle"
          aria-label={railOpen ? "Hide market pulse" : "Show market pulse"}
          aria-expanded={railOpen}
          onClick={() => setRailOpen((v) => !v)}
        >
          <ChevronIcon up={!railOpen} />
          <span>Market Pulse</span>
        </button>
      </div>
      <AdvisorFooter />
    </div>
  );
}
