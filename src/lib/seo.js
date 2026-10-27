// Search engines and link previews (Syed's brief, Oct 27: "search-engine
// friendly"). Each page sets its own title, description and share card;
// Google runs the site's JavaScript, so these are what it indexes.

const SITE = "REIFGO";
const DEFAULT_DESCRIPTION =
  "REIFGO is a boutique real estate brokerage connecting investors with the UAE's leading developers. Honest advice, curated projects and events, with every opportunity in the REIFGO app.";

/** Title and description per page. Anything not listed keeps the defaults. */
const ROUTES = [
  [/^\/$/, { title: "REIFGO | The bridge between developers and investors", description: DEFAULT_DESCRIPTION }],
  [/^\/services\/?$/, {
    title: "Services | REIFGO",
    description: "Primary sales, luxury resale, investment advisory and partnership advisory from REIFGO.",
  }],
  [/^\/advisor\/?$/, {
    title: "AI Advisor | REIFGO",
    description: "Ask the REIFGO AI Advisor about markets, areas and investing in real estate.",
  }],
  [/^\/insights\/?$/, {
    title: "Insights | REIFGO",
    description: "Market news, guides and interviews from the REIFGO team.",
  }],
  [/^\/forum\/?$/, {
    title: "Global Real Estate Investment Forum | REIFGO",
    description: "REIFGO's annual forum bringing developers and investors together. Request your invitation.",
  }],
  [/^\/(privacy|terms|disclaimers|cookies)\/?$/, { title: "Legal | REIFGO", description: DEFAULT_DESCRIPTION }],
];

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Sets the page's title, description, canonical link and share-card tags. */
export function setPageMeta({ title, description, image, noindex = false } = {}) {
  const t = title || `${SITE} | The bridge between developers and investors`;
  const d = description || DEFAULT_DESCRIPTION;
  const url = window.location.origin + window.location.pathname;
  document.title = t;
  setMeta("name", "description", d);
  setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
  setMeta("property", "og:title", t);
  setMeta("property", "og:description", d);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", SITE);
  setMeta("property", "og:image", image || `${window.location.origin}/og-image.jpg`);
  setMeta("name", "twitter:card", "summary_large_image");
  setCanonical(url);
}

/** Called on every page change. Article pages refine it once their content loads. */
export function setRouteMeta(pathname) {
  // The CMS is private: keep it out of search results.
  if (pathname.startsWith("/admin")) {
    setPageMeta({ title: "REIFGO CMS", noindex: true });
    return;
  }
  const match = ROUTES.find(([re]) => re.test(pathname));
  setPageMeta(match ? match[1] : {});
}
