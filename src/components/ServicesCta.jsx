import "./ServicesCta.css";
import { useLeadModal } from "./LeadModal.jsx";

export default function ServicesCta() {
  const openLead = useLeadModal();

  return (
    <section className="scta section">
      <div className="scta__box" data-reveal>
        <h2 className="scta__title">Ready to Scale Your Portfolio?</h2>
        <p className="scta__lead">
          Connect with our institutional advisory team to design your next phase
          of global growth.
        </p>
        <button className="btn btn--lg scta__btn" onClick={() => openLead("consultation")}>
          Book a Consultation
        </button>
      </div>
    </section>
  );
}
