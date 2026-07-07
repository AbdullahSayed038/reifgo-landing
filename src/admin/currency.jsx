import { createContext, useContext, useState } from "react";

// Prices are STORED in USD (the Property.min_entry_price column); this
// context only changes how they're displayed. AED is pegged to the dollar.
export const USD_TO_AED = 3.6725;

const STORAGE_KEY = "reifgo_admin_currency";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "USD",
  );

  const setCurrency = (next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setCurrencyState(next);
  };

  const fmtMoney = (usd) => {
    if (usd == null || usd === "") return "—";
    const value = currency === "AED" ? Number(usd) * USD_TO_AED : Number(usd);
    return new Intl.NumberFormat(currency === "AED" ? "en-AE" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmtMoney }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
