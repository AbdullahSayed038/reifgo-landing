import { Link } from "react-router-dom";
import { useLeadModal } from "./LeadModal.jsx";
import { FOOTER_TARGETS } from "../lib/siteLinks.js";

// A footer label resolved to something that works: a page, a section on the
// home page, or the contact form. Unknown labels render as plain text rather
// than a link to "#".
export default function FooterLink({ label, className }) {
  const openLead = useLeadModal();
  const target = FOOTER_TARGETS[label];

  if (target?.intent) {
    return (
      <button type="button" className={`${className} footer-link-btn`} onClick={() => openLead(target.intent)}>
        {label}
      </button>
    );
  }
  if (target?.to?.includes("#")) {
    // Hash targets need a real navigation so the browser scrolls to the section.
    return (
      <a href={target.to} className={className}>
        {label}
      </a>
    );
  }
  if (target?.to) {
    return (
      <Link to={target.to} className={className}>
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}
