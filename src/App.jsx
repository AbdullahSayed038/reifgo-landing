import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Advisor from "./pages/Advisor.jsx";
import Insights from "./pages/Insights.jsx";
import InsightArticle from "./pages/InsightArticle.jsx";
import ForumPage from "./pages/ForumPage.jsx";
import ChatWidget from "./components/ChatWidget.jsx";

// CMS dashboard — code-split so visitors never download admin JS/CSS.
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

// How long the outgoing page takes to fade away before the next one is
// mounted. Deliberately short: long enough to soften the swap, not long
// enough to feel like waiting. The incoming fade (in CSS) is slower.
const EXIT_MS = 120;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Jump to the top without animating. `html` has scroll-behavior:smooth, which
// would otherwise turn this into a visible scroll-up on every navigation.
const jumpToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });

export default function App() {
  const location = useLocation();

  // The route actually on screen. It lags behind the URL for one short beat so
  // the outgoing page can fade before it's replaced — without this, React
  // Router swaps the DOM instantly and the change reads as a hard cut.
  const [shown, setShown] = useState(location);
  const [phase, setPhase] = useState("in");

  const pathname = shown.pathname;
  // The CMS is a working tool, not a marketing page: switching tabs there
  // should stay instant rather than costing a fade each time.
  const skipAnimation =
    location.pathname.startsWith("/admin") || pathname.startsWith("/admin");

  useEffect(() => {
    if (location.pathname === pathname) return;

    if (skipAnimation || prefersReducedMotion()) {
      setShown(location);
      jumpToTop();
      return;
    }

    setPhase("out");
    const timer = setTimeout(() => {
      setShown(location);
      // Reset scroll while the page is invisible, so the jump is never seen.
      jumpToTop();
      setPhase("in");
    }, EXIT_MS);

    return () => clearTimeout(timer);
  }, [location, pathname, skipAnimation]);

  return (
    <>
      <div className="route-fade" data-phase={phase}>
        <Routes location={shown}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/:slug" element={<InsightArticle />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={null}>
                <AdminApp />
              </Suspense>
            }
          />
        </Routes>
      </div>
      {/* Sits outside the fading wrapper so the launcher stays put across
          navigations instead of blinking with the page.
          The Advisor page has its own full-screen chat, and the CMS doesn't need it. */}
      {pathname !== "/advisor" && !pathname.startsWith("/admin") && <ChatWidget />}
    </>
  );
}
