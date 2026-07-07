export default function StatCard({ label, value, accent }) {
  return (
    <div className={`adm-stat${accent ? " adm-stat--accent" : ""}`}>
      <span className="adm-stat__value">{value ?? "—"}</span>
      <span className="adm-stat__label">{label}</span>
    </div>
  );
}
