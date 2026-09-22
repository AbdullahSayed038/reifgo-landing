import { Link } from "react-router-dom";

// Tappable stat tile — links to the section it summarizes (`to`), or runs
// `onClick` (e.g. switch a tab on the same page). `accent` draws attention
// (a non-zero overdue count); `hint` is a small line under the label.
export default function StatCard({ label, value, to, accent, onClick, hint }) {
  const cls = `adm-stat${to || onClick ? " adm-stat--link" : ""}${accent ? " adm-stat--accent" : ""}`;
  const content = (
    <>
      <span className="adm-stat__value">{value ?? "—"}</span>
      <span className="adm-stat__label">{label}</span>
      {hint && <span className="adm-stat__hint">{hint}</span>}
    </>
  );

  if (to) return <Link className={cls} to={to}>{content}</Link>;
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}
