// Google Analytics 4 (Syed's brief, Oct 27). Off until a measurement ID is set
// as VITE_GA_ID in the hosting settings (e.g. "G-XXXXXXXXXX"), so nothing is
// sent while the site is in testing. The CMS is never tracked.

const GA_ID = import.meta.env.VITE_GA_ID;
let loaded = false;

function load() {
  if (loaded || !GA_ID || typeof window === "undefined") return false;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  // Page views are sent by trackPageView on each route change instead.
  window.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
  return true;
}

/** One page view per route change (the site is a single-page app). */
export function trackPageView(pathname) {
  if (!GA_ID || pathname.startsWith("/admin")) return;
  load();
  window.gtag?.("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** A form sent from the website, e.g. trackEvent("generate_lead", { form: "valuation" }). */
export function trackEvent(name, params = {}) {
  if (!GA_ID || !loaded) return;
  window.gtag?.("event", name, params);
}
