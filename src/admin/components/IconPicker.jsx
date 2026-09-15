import { useState } from "react";

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

/** Icons that suit real-estate amenities; any other mci: name can be typed. */
export const AMENITY_ICONS = [
  "swim", "pool", "dumbbell", "yoga", "run", "tennis", "basketball", "spa-outline", "hot-tub",
  "parking", "garage", "ev-station", "elevator-passenger", "shield-check-outline", "cctv", "gate",
  "room-service-outline", "seesaw", "grill-outline", "tree-outline", "flower-outline", "paw",
  "home-group", "laptop", "movie-open-outline", "beach", "office-building", "balcony",
  "air-conditioner", "home-automation", "washing-machine", "stove", "hanger", "wardrobe-outline",
  "bed-outline", "desk", "sofa-outline", "fireplace", "wifi", "bathtub-outline", "countertop-outline",
  "water-outline", "lock-outline", "dog", "car", "check-circle-outline",
].map((n) => `mci:${n}`);

/** A grid of common icons plus a box for any other icon name. */
export default function IconPicker({ value, onChange }) {
  return (
    <div className="adm-field adm-field--span2">
      <span className="adm-field__label">Icon</span>
      <div className="adm-icon-grid" role="radiogroup" aria-label="Icon">
        {AMENITY_ICONS.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === name}
            title={name}
            className={value === name ? "is-active" : ""}
            onClick={() => onChange(name)}
          >
            <IconPreview name={name} />
          </button>
        ))}
      </div>
      <div className="adm-amenity-cell" style={{ marginTop: 8 }}>
        <IconPreview name={value} large />
        <input
          value={value ?? ""}
          placeholder="Or type an icon name, e.g. mci:swim"
          onChange={(e) => onChange(e.target.value.trim())}
        />
      </div>
      <span className="adm-field__hint">
        Browse more at pictogrammers.com/library/mdi and type mci: plus the name.
      </span>
    </div>
  );
}
