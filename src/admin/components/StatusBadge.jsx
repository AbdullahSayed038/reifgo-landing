const LABELS = {
  active: "Active",
  coming_soon: "Coming soon",
  sold_out: "Sold out",
  pending: "Pending",
  contacted: "Contacted",
  closed: "Closed",
  virtual: "Virtual",
  in_person: "In person",
  express_interest: "Express interest",
  callback_request: "Callback",
  document_request: "Documents",
  join_network: "Join network",
  advisory_request: "Advisory",
  regular: "Regular",
  premium_investor: "Premium",
};

export default function StatusBadge({ value }) {
  if (!value) return null;
  return (
    <span className={`adm-badge adm-badge--${value}`}>
      {LABELS[value] ?? value}
    </span>
  );
}
