import { Link } from "react-router-dom";

// Tappable stat tile — links to the section it summarizes.
export default function StatCard({ label, value, to }) {
  const content = (
    <>
      <span className="adm-stat__value">{value ?? "—"}</span>
      <span className="adm-stat__label">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link className="adm-stat adm-stat--link" to={to}>
        {content}
      </Link>
    );
  }
  return <div className="adm-stat">{content}</div>;
}
