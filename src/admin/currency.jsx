import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

// Every listing is priced in its own country's currency (Syed, Sept 24), and
// prices are shown that way by default. Each person can pick a currency to
// convert them to in Account settings; converted figures are approximate
// (rates from the backend's /currency/rates, refreshed daily). AED is pegged
// to the dollar, so AED <-> USD is exact.
export const USD_TO_AED = 3.6725;

// A new key: the old one meant "USD or AED" when every price was one currency.
const STORAGE_KEY = "reifgo_admin_price_currency";
export const ORIGINAL = "original";

// Shown first in the picker: the currencies REIFGO's markets and investors use most.
export const COMMON_CURRENCIES = [
  "USD", "AED", "EUR", "GBP", "SAR", "QAR", "KWD", "BHD", "OMR", "EGP", "TRY",
  "INR", "PKR", "CNY", "RUB", "CHF", "CAD", "AUD", "SGD", "HKD", "JPY",
];

const names = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {
    return null;
  }
})();

export const currencyName = (code) => names?.of(code) ?? code;

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || ORIGINAL;
  } catch {
    return ORIGINAL;
  }
};

/** "AED 1,285,000" / "£264,000", exactly as stored. */
export function formatIn(amount, code) {
  if (amount == null || amount === "" || Number.isNaN(Number(amount))) return "—";
  try {
    return new Intl.NumberFormat(code === "AED" ? "en-AE" : "en-US", {
      style: "currency",
      currency: code || "USD",
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${code} ${Math.round(Number(amount)).toLocaleString()}`;
  }
}

const pegged = (a, b) => (a === "USD" && b === "AED") || (a === "AED" && b === "USD");

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(readSaved);
  const [rates, setRates] = useState({ USD: 1, AED: USD_TO_AED });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  useEffect(() => {
    api
      .get("/currency/rates")
      .then((r) => {
        if (r?.rates) setRates({ ...r.rates, USD: 1, AED: USD_TO_AED });
        setRatesUpdatedAt(r?.updated_at ?? null);
      })
      .catch(() => {});
  }, []);

  const setCurrency = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice just lasts for this visit */
    }
    setCurrencyState(next);
  };

  const value = useMemo(() => {
    /**
     * A price stored in `from`, shown the way this person asked: as it is, or
     * converted with a "≈". Unknown rates fall back to the original.
     */
    const fmtMoney = (amount, from = "USD") => {
      if (amount == null || amount === "" || Number.isNaN(Number(amount))) return "—";
      const to = currency === ORIGINAL ? from : currency;
      if (to === from || !rates[from] || !rates[to]) return formatIn(amount, from);
      const converted = (Number(amount) / rates[from]) * rates[to];
      return `${pegged(from, to) ? "" : "≈ "}${formatIn(converted, to)}`;
    };
    const available = Object.keys(rates).filter((c) => /^[A-Z]{3}$/.test(c)).sort();
    return { currency, setCurrency, fmtMoney, available, ratesUpdatedAt, converting: currency !== ORIGINAL };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, rates, ratesUpdatedAt]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
