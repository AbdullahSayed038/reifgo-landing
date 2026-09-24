import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ICON_SETS, iconLabel } from "../iconCatalog.js";

/**
 * The app draws listing icons with Material Community Icons ("mci:swim") or
 * Ionicons ("water-outline"). The CMS can't load those fonts, so it previews
 * the same glyphs as images from Iconify, which carries both sets.
 */
export function iconUrl(name) {
  if (!name) return null;
  const clean = name.trim();
  if (!clean) return null;
  return clean.startsWith("mci:")
    ? `https://api.iconify.design/mdi/${clean.slice(4)}.svg?color=%2300556c`
    : `https://api.iconify.design/ion/${clean}.svg?color=%2300556c`;
}

export function IconPreview({ name, large = false }) {
  const [broken, setBroken] = useState(null);
  const url = iconUrl(name);
  const cls = `adm-icon-preview${large ? " adm-icon-preview--lg" : ""}`;
  if (!url || broken === url) {
    return <span className={`${cls} adm-icon-preview--empty`} aria-hidden="true" />;
  }
  return <img className={cls} src={url} alt="" loading="lazy" onError={() => setBroken(url)} />;
}

/** The amenity codes, for callers that only need the list. */
export const AMENITY_ICONS = ICON_SETS.amenities.map((o) => o.icon);

/** Icons in `set` matching `query` by name; falls back to every set. */
function search(set, query) {
  const q = query.trim().toLowerCase();
  const own = ICON_SETS[set] ?? ICON_SETS.amenities;
  if (!q) return own;
  const hit = (o) => o.label.toLowerCase().includes(q);
  const found = own.filter(hit);
  if (found.length) return found;
  const seen = new Set();
  return Object.values(ICON_SETS).flat().filter((o) => hit(o) && !seen.has(o.icon) && seen.add(o.icon));
}

/** A grid of named icons, e.g. "Swimming pool", with a search box. */
function IconGrid({ set, value, onPick, autoFocus = false }) {
  const [query, setQuery] = useState("");
  const options = search(set, query);
  return (
    <>
      <input
        className="adm-icon-search"
        type="search"
        value={query}
        autoFocus={autoFocus}
        placeholder="Search icons, e.g. pool, airport, park"
        aria-label="Search icons"
        onChange={(e) => setQuery(e.target.value)}
      />
      {options.length === 0 ? (
        <p className="adm-icon-empty">No icon matches "{query}". Try another word.</p>
      ) : (
        <div className="adm-icon-grid adm-icon-grid--named" role="listbox" aria-label="Icons">
          {options.map((o) => (
            <button
              key={o.icon}
              type="button"
              role="option"
              aria-selected={value === o.icon}
              className={value === o.icon ? "is-active" : ""}
              onClick={() => onPick(o.icon)}
            >
              <IconPreview name={o.icon} />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** The inline picker used in the amenity dialogs. */
export default function IconPicker({ value, onChange, set = "amenities" }) {
  const name = iconLabel(value);
  return (
    <div className="adm-field adm-field--span2">
      <span className="adm-field__label">Icon</span>
      <IconGrid set={set} value={value} onPick={onChange} />
      <div className="adm-icon-chosen">
        <IconPreview name={value} large />
        <span>{value ? name ?? "Current icon" : "No icon picked yet"}</span>
      </div>
    </div>
  );
}

/**
 * A compact dropdown for a single icon, for rows like nearby places and
 * company values: shows the chosen icon and its name, and opens a searchable
 * grid. The panel is portalled so a row's layout can't clip it.
 */
export function IconSelect({ value, onChange, set = "amenities", invalid = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const trigger = useRef(null);
  const panel = useRef(null);

  const place = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
    const below = window.innerHeight - r.bottom;
    // Open upwards when there isn't room below.
    setPos(below < 340 && r.top > below ? { left, width, bottom: window.innerHeight - r.top + 6, up: true } : { left, width, top: r.bottom + 6 });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e) => {
      if (!trigger.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const name = value ? iconLabel(value) ?? "Current icon" : "Choose an icon";

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`adm-icon-select${value ? "" : " is-empty"}${invalid ? " is-invalid" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconPreview name={value} />
        <span className="adm-icon-select__name">{name}</span>
        <span className="adm-icon-select__chev" aria-hidden="true" />
      </button>
      {open && pos && createPortal(
        <div
          ref={panel}
          className={`adm-icon-pop${pos.up ? " adm-icon-pop--up" : ""}`}
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
        >
          <IconGrid
            set={set}
            value={value}
            autoFocus
            onPick={(icon) => {
              onChange(icon);
              setOpen(false);
              trigger.current?.focus();
            }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
