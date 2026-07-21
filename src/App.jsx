import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Advisor from "./pages/Advisor.jsx";
import Insights from "./pages/Insights.jsx";
import ForumPage from "./pages/ForumPage.jsx";
import ChatWidget from "./components/ChatWidget.jsx";

// CMS dashboard — code-split so visitors never download admin JS/CSS.
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

// Reset scroll position on every route change.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route path="/insights" element={<Insights />} />
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
      {/* The Advisor page has its own full-screen chat, and the CMS doesn't need it. */}
      {pathname !== "/advisor" && !pathname.startsWith("/admin") && <ChatWidget />}
    </>
  );
}
