// Countries a listing can be in, each with the currency its prices are in
// (a listing's currency is locked to its country). Must match
// REIFGO/backend/src/countries.ts, which refuses anything else.
export const COUNTRIES = [
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" },
  { code: "QA", name: "Qatar", currency: "QAR" },
  { code: "BH", name: "Bahrain", currency: "BHD" },
  { code: "KW", name: "Kuwait", currency: "KWD" },
  { code: "OM", name: "Oman", currency: "OMR" },
  { code: "EG", name: "Egypt", currency: "EGP" },
  { code: "JO", name: "Jordan", currency: "JOD" },
  { code: "MA", name: "Morocco", currency: "MAD" },
  { code: "TR", name: "Turkey", currency: "TRY" },
  { code: "CY", name: "Cyprus", currency: "EUR" },
  { code: "GR", name: "Greece", currency: "EUR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "PT", name: "Portugal", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "AT", name: "Austria", currency: "EUR" },
  { code: "MT", name: "Malta", currency: "EUR" },
  { code: "ME", name: "Montenegro", currency: "EUR" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "GE", name: "Georgia", currency: "GEL" },
  { code: "AZ", name: "Azerbaijan", currency: "AZN" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "LK", name: "Sri Lanka", currency: "LKR" },
  { code: "MV", name: "Maldives", currency: "MVR" },
  { code: "TH", name: "Thailand", currency: "THB" },
  { code: "ID", name: "Indonesia", currency: "IDR" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "VN", name: "Vietnam", currency: "VND" },
  { code: "PH", name: "Philippines", currency: "PHP" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "HK", name: "Hong Kong", currency: "HKD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "NZ", name: "New Zealand", currency: "NZD" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "DO", name: "Dominican Republic", currency: "DOP" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "MU", name: "Mauritius", currency: "MUR" },
  { code: "SC", name: "Seychelles", currency: "SCR" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export const countryByCode = (code) => (code ? BY_CODE.get(code) ?? null : null);
export const countryName = (code) => countryByCode(code)?.name ?? code ?? "";
export const currencyFor = (code) => countryByCode(code)?.currency ?? null;
/** RERA (Dubai's regulator) only applies to UAE listings. */
export const isUae = (code) => code === "AE";
