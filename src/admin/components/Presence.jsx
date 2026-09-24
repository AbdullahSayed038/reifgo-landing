import { presence } from "../api.js";

/**
 * A green dot and "Online", or a grey dot and when they were last in the CMS.
 * `compact` shows just the dot, with the words as a tooltip.
 */
export default function Presence({ at, compact = false }) {
  const p = presence(at);
  return (
    <span className={`adm-presence${p.online ? " is-online" : ""}`} title={p.label}>
      <span className="adm-presence__dot" aria-hidden="true" />
      {compact ? <span className="adm-visually-hidden">{p.label}</span> : <span>{p.label}</span>}
    </span>
  );
}
