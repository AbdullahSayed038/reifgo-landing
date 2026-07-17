import { Link } from "react-router-dom";

// Tappable stat tile — links to the section it summarizes. `accent` draws
// attention (e.g. a non-zero overdue count).
export default function StatCard({ label, value, to, accent }) {
  const cls = `adm-stat${to ? " adm-stat--link" : ""}${accent ? " adm-stat--accent" : ""}`;
  const content = (
    <>
      <span className="adm-stat__value">{value ?? "—"}</span>
      <span className="adm-stat__label">{label}</span>
    </>
  );

  return to ? (
    <Link className={cls} to={to}>{content}</Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}
