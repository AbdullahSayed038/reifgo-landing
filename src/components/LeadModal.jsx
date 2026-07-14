import { useEffect, useState } from "react";
import { addWebsiteLead } from "../lib/demoStore.js";
import "./LeadModal.css";

const INTERESTS = ["Residential", "Commercial", "Mixed-use", "General investment"];

const COPY = {
  join_network: {
    title: "Join the Network",
    lead: "Tell us a little about yourself and our team will set up your investor access.",
  },
  advisory_request: {
    title: "Request Advisory",
    lead: "Share your goals and a REIFGO advisor will reach out within one business day.",
  },
};

// Mock lead-capture form: submissions land in the CMS Leads inbox
// (source: Website). When the backend is live this posts to the API
// instead of the shared demo store.
export default function LeadModal({ intent, onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    interest: INTERESTS[3],
    message: "",
  });
  const [done, setDone] = useState(false);
  const copy = COPY[intent];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    addWebsiteLead({ ...form, lead_type: intent });
    setDone(true);
  };

  return (
    <div className="lm__overlay" onClick={onClose}>
      <div
        className="lm__card"
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="lm__close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        {done ? (
          <div className="lm__done">
            <span className="lm__done-mark" aria-hidden="true">✓</span>
            <h3 className="lm__title heading">Thank you, {form.name.split(" ")[0] || "investor"}.</h3>
            <p className="lm__lead">
              Your request has been received — our team will reach out at{" "}
              <strong>{form.email || form.phone}</strong> shortly.
            </p>
            <button className="btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p className="eyebrow">REIFGO Network</p>
            <h3 className="lm__title heading">{copy.title}</h3>
            <p className="lm__lead">{copy.lead}</p>

            <form className="lm__form" onSubmit={submit}>
              <label className="lm__field">
                <span>Full name</span>
                <input required autoFocus value={form.name} onChange={set("name")} placeholder="Your name" />
              </label>
              <div className="lm__row">
                <label className="lm__field">
                  <span>Email</span>
                  <input type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" />
                </label>
                <label className="lm__field">
                  <span>Phone</span>
                  <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+971 …" />
                </label>
              </div>
              <label className="lm__field">
                <span>Area of interest</span>
                <select value={form.interest} onChange={set("interest")}>
                  {INTERESTS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="lm__field">
                <span>Anything we should know? (optional)</span>
                <textarea rows={3} value={form.message} onChange={set("message")} placeholder="Investment size, timeline, markets…" />
              </label>
              <button className="btn lm__submit" type="submit">
                Submit request
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
