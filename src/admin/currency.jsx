import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

// Prices are STORED in USD (the Property.min_entry_price column); this
// context only changes how they're displayed. Each person picks their display
// currency in Account settings. Rates come from the backend (/currency/rates,
// refreshed daily), so anything but USD is approximate. AED is pegged to the
// dollar, so it's known even before the rates arrive.
export const USD_TO_AED = 3.6725;

const STORAGE_KEY = "reifgo_admin_currency";

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
    return localStorage.getItem(STORAGE_KEY) || "USD";
  } catch {
    return "USD";
  }
};

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

  // Until the rates load, an unknown currency shows in USD rather than a
  // wrong number.
  const shown = rates[currency] ? currency : "USD";

  const value = useMemo(() => {
    const convert = (usd) => (usd == null || usd === "" ? null : Number(usd) * rates[shown]);
    const fmtMoney = (usd) => {
      const amount = convert(usd);
      if (amount == null || Number.isNaN(amount)) return "—";
      try {
        return new Intl.NumberFormat(shown === "AED" ? "en-AE" : "en-US", {
          style: "currency",
          currency: shown,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${shown} ${Math.round(amount).toLocaleString()}`;
      }
    };
    const available = Object.keys(rates).filter((c) => /^[A-Z]{3}$/.test(c)).sort();
    return {
      currency,
      shownCurrency: shown,
      setCurrency,
      fmtMoney,
      convert,
      available,
      ratesUpdatedAt,
      // AED is a fixed peg; everything else moves daily.
      approximate: shown !== "USD" && shown !== "AED",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, shown, rates, ratesUpdatedAt]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
