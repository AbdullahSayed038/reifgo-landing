// Icon set for the summit sections. The CMS stores a key string per item
// (SummitItem.icon) rather than markup, so editors never paste SVG and the
// visual language stays consistent.
//
// Thin-stroke line style to match the rest of the site — deliberately not a
// heavy icon-font set.

const PATHS = {
  users: (
    <>
      <circle cx="8" cy="8.5" r="3" />
      <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.6M17 14.4c2.2.6 3.8 2.3 3.8 4.6" />
    </>
  ),
  panel: (
    <>
      <rect x="2.5" y="4.5" width="19" height="12" rx="1.5" />
      <path d="M7 20h10M12 16.5V20" />
      <path d="M7 9h6M7 12h4" />
    </>
  ),
  handshake: (
    <>
      <path d="M2.5 12.5l4-4 3 2.5 2.5-2 2.5 2 3-2.5 4 4" />
      <path d="M9.5 11l2.5 2.5 2 2 2 2" />
      <path d="M6.5 15.5l3 3" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="5" />
      <path d="M9 9.5L7 2.5h10l-2 7" />
      <path d="M12 12.5v4M10.5 14.5h3" />
    </>
  ),
  building: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1" />
      <path d="M8 7.5h2M14 7.5h2M8 11.5h2M14 11.5h2M8 15.5h2M14 15.5h2" />
      <path d="M10.5 20.5v-3h3v3" />
    </>
  ),
  office: (
    <>
      <rect x="3" y="7.5" width="8" height="13" rx="1" />
      <rect x="13" y="3.5" width="8" height="17" rx="1" />
      <path d="M5.5 11h3M5.5 14.5h3M15.5 7h3M15.5 10.5h3M15.5 14h3" />
    </>
  ),
  robot: (
    <>
      <rect x="4" y="8.5" width="16" height="10" rx="2" />
      <path d="M12 8.5v-3M12 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
      <path d="M9 12.5v1.5M15 12.5v1.5" />
      <path d="M2 12.5v3M22 12.5v3" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4.5c0 8-5 12-11 12-2 0-3.5-.6-3.5-.6" />
      <path d="M20 4.5C11 4.5 5 8 5 14c0 1.2.2 2 .5 2.4" />
      <path d="M4 20.5c1.5-3 4-5.5 7.5-7" />
    </>
  ),
};

export default function SummitIcon({ name, size = 24 }) {
  const path = PATHS[name];
  // An unknown or missing key renders nothing rather than a broken glyph —
  // icon is optional on SummitItem, and the layout holds without it.
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}
