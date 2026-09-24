// What stops a listing from saving, worked out before it's sent and read back
// from the server's answer, so the form can mark the exact field in red.

export const FIELD_LABEL = {
  name: "Name",
  developer_id: "Developer",
  country: "Country",
  city: "City",
  district: "Area",
  location: "Location",
  asset_class: "Asset class",
  payment_plan: "Payment plan",
  property_type: "Property type",
  ownership_type: "Ownership type",
  total_area: "Total area",
  completion_date: "Completion date",
  min_entry_price: "Min entry price",
  sustainability_rating: "Sustainability rating",
  overview: "Overview",
  status: "Status",
  media: "Media",
  roi: "ROI figures",
  construction_progress: "Construction progress",
  progress_verified_at: "Progress verified on",
  handover: "Handover",
  permits: "Permits",
  unit_types: "Unit types",
  amenities: "Amenities",
  nearby_places: "Nearby places",
  faqs: "FAQs",
};

const SECTIONS = ["media", "unit_types", "amenities", "nearby_places", "faqs"];

const blank = (v) => v == null || String(v).trim() === "";
const isNum = (v) => !blank(v) && Number.isFinite(Number(v));
const validUrl = (v) => /^https?:\/\/\S+$/i.test(String(v).trim()) || String(v).startsWith("data:");

/**
 * Returns { fields: { name: msg }, rows: { amenities: { 2: { label: msg } } } }.
 * Completely empty rows are ignored (they're dropped on save); half-filled ones
 * are flagged so nothing the developer typed disappears silently.
 */
export function validateProperty(form, { needsDeveloper }) {
  const fields = {};
  const rows = {};
  const rowError = (section, i, key, msg) => {
    rows[section] ??= {};
    rows[section][i] ??= {};
    rows[section][i][key] = msg;
  };

  if (blank(form.name)) fields.name = "Give the listing a name";
  if (needsDeveloper && blank(form.developer_id)) fields.developer_id = "Pick the developer";
  if (blank(form.country)) fields.country = "Choose the country";

  const nonNegative = (key, label) => {
    if (blank(form[key])) return;
    if (!isNum(form[key])) fields[key] = `${label} must be a number`;
    else if (Number(form[key]) < 0) fields[key] = `${label} can't be negative`;
  };
  nonNegative("total_area", "Area");
  nonNegative("min_entry_price", "Price");
  if (!blank(form.sustainability_rating)) {
    const r = Number(form.sustainability_rating);
    if (!isNum(form.sustainability_rating) || r < 0 || r > 5) fields.sustainability_rating = "Use a number from 0 to 5";
  }
  if (!blank(form.construction_progress)) {
    const c = Number(form.construction_progress);
    if (!Number.isInteger(c) || c < 0 || c > 100) fields.construction_progress = "Use a whole number from 0 to 100";
  }
  for (const key of ["annual_return", "capital_appreciation", "rental_yield"]) {
    if (!blank(form.roi[key]) && !isNum(form.roi[key])) fields[`roi.${key}`] = "Must be a number";
  }

  form.media.forEach((m, i) => {
    if (blank(m.url)) rowError("media", i, "url", "Paste an image link, or remove this row");
    else if (!validUrl(m.url)) rowError("media", i, "url", "Must be a full link starting with https://");
  });

  form.unit_types.forEach((u, i) => {
    const touched = ["name", "min_area", "max_area", "from_price", "floor_plan_url"].some((k) => !blank(u[k]));
    if (!touched) return;
    if (blank(u.name)) rowError("unit_types", i, "name", "Name this unit type");
    for (const k of ["min_area", "max_area", "from_price"]) {
      if (!blank(u[k]) && (!isNum(u[k]) || Number(u[k]) < 0)) rowError("unit_types", i, k, "Must be a number");
    }
    if (isNum(u.min_area) && isNum(u.max_area) && Number(u.min_area) > Number(u.max_area)) {
      rowError("unit_types", i, "max_area", "Must be at least the min");
    }
    if (!blank(u.floor_plan_url) && !validUrl(u.floor_plan_url)) {
      rowError("unit_types", i, "floor_plan_url", "Must be a full link starting with https://");
    }
  });

  form.amenities.forEach((a, i) => {
    if (a.custom && blank(a.label)) rowError("amenities", i, "amenity", "Type the amenity's name, or pick one from the list");
    else if (!a.custom && blank(a.label)) rowError("amenities", i, "amenity", "Pick an amenity, or remove this row");
  });

  form.nearby_places.forEach((n, i) => {
    const touched = ["name", "icon", "travel_minutes", "distance_km"].some((k) => !blank(n[k]));
    if (!touched) return;
    if (blank(n.name)) rowError("nearby_places", i, "name", "Required");
    if (blank(n.icon)) rowError("nearby_places", i, "icon", "Required");
    if (blank(n.distance_km)) rowError("nearby_places", i, "distance_km", "Required");
    else if (!isNum(n.distance_km) || Number(n.distance_km) < 0) rowError("nearby_places", i, "distance_km", "Must be a number");
    if (!blank(n.travel_minutes) && !(Number.isInteger(Number(n.travel_minutes)) && Number(n.travel_minutes) >= 0)) {
      rowError("nearby_places", i, "travel_minutes", "Whole minutes");
    }
  });

  form.faqs.forEach((f, i) => {
    if (blank(f.question) && blank(f.answer)) return;
    if (blank(f.question)) rowError("faqs", i, "question", "Add the question");
    if (blank(f.answer)) rowError("faqs", i, "answer", "Add the answer");
  });

  return { fields, rows };
}

const FRIENDLY = [
  [/must be a URL address/i, "Must be a full link starting with https://"],
  [/should not be empty|must be longer than or equal to 1 characters/i, "Required"],
  [/must be a number|must be an integer/i, "Must be a number"],
  [/must not be greater than (\d+)/i, (m) => `Can't be more than ${m[1]}`],
  [/must not be less than (\d+)/i, (m) => `Can't be less than ${m[1]}`],
  [/must be one of the following values/i, "Pick one of the options"],
  [/ISO 8601 date/i, "Pick a valid date"],
];

function friendly(text) {
  for (const [re, out] of FRIENDLY) {
    const m = text.match(re);
    if (m) return typeof out === "function" ? out(m) : out;
  }
  return text;
}

/**
 * Turns the server's validation messages ("media.0.url must be a URL address")
 * into the same shape as validateProperty, plus anything it couldn't place.
 */
export function mapServerErrors(message, details) {
  const fields = {};
  const rows = {};
  const other = [];
  const parts = Array.isArray(details) && details.length
    ? details
    : String(message ?? "").split(/,\s*(?=[a-z_]+(?:\.\d+\.[a-z_]+)?\s)/i);
  for (const raw of parts) {
    const text = raw.trim();
    if (!text) continue;
    let m = text.match(/^([a-z_]+)\.(\d+)\.([a-z_]+)\s+(.*)$/i);
    if (m && SECTIONS.includes(m[1])) {
      const key = m[1] === "amenities" && ["label", "icon"].includes(m[3]) ? "amenity" : m[3];
      rows[m[1]] ??= {};
      rows[m[1]][Number(m[2])] ??= {};
      rows[m[1]][Number(m[2])][key] = friendly(m[4]);
      continue;
    }
    m = text.match(/^roi\.([a-z_]+)\s+(.*)$/i);
    if (m) {
      fields[`roi.${m[1]}`] = friendly(m[2]);
      continue;
    }
    m = text.match(/^([a-z_]+)\s+(.*)$/i);
    if (m && FIELD_LABEL[m[1]] && !/should not exist/i.test(m[2])) {
      fields[m[1]] = friendly(m[2]);
      continue;
    }
    other.push(text);
  }
  return { fields, rows, other };
}

/** Lines for the red summary at the top of the form. */
export function summarise({ fields, rows, other = [] }) {
  const lines = [];
  for (const [key, msg] of Object.entries(fields)) {
    const label = key.startsWith("roi.") ? "ROI figures" : FIELD_LABEL[key] ?? key;
    lines.push({ field: key.startsWith("roi.") ? "roi" : key, text: `${label}: ${msg}` });
  }
  for (const [section, byRow] of Object.entries(rows)) {
    for (const [i, errs] of Object.entries(byRow)) {
      for (const msg of Object.values(errs)) {
        lines.push({ field: section, text: `${FIELD_LABEL[section]}, row ${Number(i) + 1}: ${msg}` });
      }
    }
  }
  for (const text of other) lines.push({ field: null, text });
  return lines;
}
