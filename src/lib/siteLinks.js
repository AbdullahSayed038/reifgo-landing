// Where the footer links point, in one place for both footers.
//
// Social profiles: REIFGO has not shared its LinkedIn or X addresses yet, and
// an icon that goes nowhere reads as broken, so an icon only renders once its
// URL is filled in here.
export const SOCIAL_URLS = {
  LinkedIn: "",
  X: "",
  Website: "",
};

// A footer entry is either a route/anchor (`to`) or a lead form (`intent`).
export const FOOTER_TARGETS = {
  Investments: { to: "/#markets" },
  Developers: { intent: "partner" },
  Advisory: { to: "/advisor" },
  "About Us": { to: "/#about" },
  "Investor Relations": { intent: "contact" },
  Contact: { intent: "contact" },
  Services: { to: "/services" },
  Insights: { to: "/insights" },
  "Privacy Policy": { to: "/privacy" },
  "Terms of Service": { to: "/terms" },
  Disclaimers: { to: "/disclaimers" },
  "Investment Disclaimer": { to: "/disclaimers" },
  Cookies: { to: "/cookies" },
};

// The app's web build. Listings only live in the app (Syed, Oct 27), so any
// link to a listing goes to `${APP_WEB_URL}/property/<id>`.
export const APP_WEB_URL = "https://reifgo.expo.app";
