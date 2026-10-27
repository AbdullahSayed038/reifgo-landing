// Where the visitor is, from their IP address (Oct 27), like YouTube's
// regional sites: no location prompt. The backend works it out on the server
// (GET /geo). Asked once per visit; forms use it to fill in the country and
// show budgets in the visitor's currency.

const BASE = import.meta.env.VITE_API_URL || "/cms-api";
const KEY = "reifgo_geo_v1";

let pending = null;

/** { country, country_name, currency } or null when it can't be told. */
export function getGeo() {
  if (pending) return pending;
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return (pending = Promise.resolve(JSON.parse(saved)));
  } catch {
    // Private mode: just ask the server.
  }
  pending = fetch(`${BASE}/geo`)
    .then((r) => (r.ok ? r.json() : null))
    .then((geo) => {
      if (geo?.country) {
        try {
          sessionStorage.setItem(KEY, JSON.stringify(geo));
        } catch {
          /* ignore */
        }
      }
      return geo?.country ? geo : null;
    })
    .catch(() => null);
  return pending;
}

let ratesPending = null;

/** Exchange rates per US dollar, from the backend; null if unavailable. */
export function getRates() {
  ratesPending ??= fetch(`${BASE}/currency/rates`)
    .then((r) => (r.ok ? r.json() : null))
    .then((b) => b?.rates ?? null)
    .catch(() => null);
  return ratesPending;
}

const AED_PER_USD = 3.6725;
const SYMBOL = { USD: "$", GBP: "£", EUR: "€" };

/** Rounds to 1, 2, 2.5 or 5 times a power of ten, so budgets read like budgets. */
function nice(n) {
  const p = 10 ** Math.floor(Math.log10(n));
  const f = n / p;
  const step = f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.75 ? 2.5 : f < 7.5 ? 5 : 10;
  return step * p;
}

function compact(value, currency) {
  const sym = SYMBOL[currency];
  const lead = sym ?? `${currency} `;
  const s =
    value >= 1e6 ? `${+(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value));
  return `${lead}${s}`;
}

/**
 * The event form's budget ranges (AED 1M / 5M / 20M) in the visitor's
 * currency, rounded. AED, or no rates, gives the AED ranges.
 */
export function budgetOptions(currency, rates) {
  const edges = [1e6, 5e6, 20e6];
  let cur = "AED";
  let values = edges;
  if (currency && currency !== "AED" && rates?.[currency]) {
    cur = currency;
    values = edges.map((aed) => nice((aed / AED_PER_USD) * rates[currency]));
  }
  const [a, b, c] = values.map((v) => compact(v, cur));
  // "AED 1M - 5M": a currency code isn't repeated inside a range; a symbol is ("£200K - £1M").
  const bare = (x) => (SYMBOL[cur] ? x : x.slice(cur.length + 1));
  return [`Under ${a}`, `${a} - ${bare(b)}`, `${b} - ${bare(c)}`, `Over ${c}`];
}
