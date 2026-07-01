import { useEffect, useRef, useState } from "react";
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

// Tap-vs-drag threshold, in px of pointer travel, before a press on the
// handle counts as a drag rather than a simple tap-to-toggle.
const DRAG_THRESHOLD = 6;
// Drag far enough (as a fraction of the sheet's own height) away from the
// state you started in, and it commits to the opposite state — otherwise it
// snaps back. Kept small since the sheet is tall; "cross the halfway mark"
// would need an unreasonably long swipe to close.
const COMMIT_RATIO = 0.2;
// A quick flick past this speed (px/ms) commits immediately, regardless of
// how far it traveled — matches how native bottom sheets feel.
const FLICK_VELOCITY = 0.5;

export default function Advisor() {
  useEffect(() => initReveal(), []);

  // On mobile the workspace sidebar (profile + AI Chat/Market Trends/...) is
  // hidden behind the header's account icon instead of sitting inline above
  // the conversation. Desktop is unaffected — the sidebar stays inline there.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On mobile the chat fills the screen like a normal chat app; Market Pulse
  // (the right rail on desktop) becomes a bottom sheet toggled by an arrow
  // handle instead of sitting inline and forcing a long page scroll. The
  // handle also supports a real drag (pull up/down), not just a tap.
  const [railOpen, setRailOpen] = useState(false);
  const railRef = useRef(null);
  const drag = useRef({ active: false, startY: 0, startTime: 0, startTranslate: 0, sheetHeight: 0, moved: 0 });

  function handlePointerDown(e) {
    const rail = railRef.current;
    if (!rail) return;
    const sheetHeight = rail.getBoundingClientRect().height;
    drag.current = {
      active: true,
      startY: e.clientY,
      startTime: performance.now(),
      startTranslate: railOpen ? 0 : sheetHeight,
      sheetHeight,
      moved: 0,
    };
    rail.style.transition = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e) {
    const d = drag.current;
    if (!d.active) return;
    const rail = railRef.current;
    const delta = e.clientY - d.startY;
    d.moved = Math.abs(delta);
    const translate = Math.max(0, Math.min(d.sheetHeight, d.startTranslate + delta));
    if (rail) rail.style.transform = `translateY(${translate}px)`;
  }

  function handlePointerUp(e) {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    const rail = railRef.current;
    const delta = e.clientY - d.startY;
    const elapsedMs = Math.max(1, performance.now() - d.startTime);
    const velocity = delta / elapsedMs; // px/ms — negative = flicked upward

    let nextOpen;
    if (d.moved < DRAG_THRESHOLD) {
      // Barely moved — treat as a plain tap.
      nextOpen = !railOpen;
    } else if (Math.abs(velocity) > FLICK_VELOCITY) {
      // Fast flick commits in that direction regardless of distance covered.
      nextOpen = velocity < 0;
    } else if (d.moved / d.sheetHeight > COMMIT_RATIO) {
      // Dragged far enough away from the starting state to commit to the
      // opposite of whatever it was.
      nextOpen = !railOpen;
    } else {
      // Didn't drag far or fast enough — snap back to where it started.
      nextOpen = railOpen;
    }

    if (rail) {
      // Animate from wherever the finger let go to the resting position —
      // re-enabling the CSS transition first (was disabled during drag), so
      // clearing the transform doesn't just snap back to the old state
      // before React re-renders with the new class.
      rail.style.transition = "";
      rail.style.transform = `translateY(${nextOpen ? 0 : d.sheetHeight}px)`;
      const durationMs = parseFloat(getComputedStyle(rail).transitionDuration) * 1000 || 260;
      window.setTimeout(() => {
        if (railRef.current) railRef.current.style.transform = "";
      }, durationMs + 30);
    }
    setRailOpen(nextOpen);
  }

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
        <AdvisorRail ref={railRef} className={railOpen ? "is-open" : ""} />
        <button
          className="arail__toggle"
          aria-label={railOpen ? "Hide market pulse" : "Show market pulse"}
          aria-expanded={railOpen}
          onPointerDown={handlePointerDown}
        >
          <span className="arail__toggle-grip" aria-hidden="true" />
          <span className="arail__toggle-label">
            <ChevronIcon up={!railOpen} />
            <span>Market Pulse</span>
          </span>
        </button>
      </div>
      <AdvisorFooter />
    </div>
  );
}
