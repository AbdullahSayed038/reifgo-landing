import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { sendWebsiteLead } from "../lib/contentApi.js";
import "./LeadModal.css";

const INTERESTS = ["Residential", "Commercial", "Mixed-use", "General investment"];

// One form, opened from every call to action on the site. The intent decides
// the wording here and how the lead is labelled in the CMS.
const COPY = {
  join_network: {
    eyebrow: "REIFGO Network",
    title: "Join the Network",
    lead: "Tell us a little about yourself and our team will set up your investor access.",
  },
  advisory_request: {
    eyebrow: "REIFGO Advisory",
    title: "Request Advisory",
    lead: "Share your goals and a REIFGO advisor will reach out within one business day.",
  },
  invest: {
    eyebrow: "Invest with REIFGO",
    title: "Start Investing",
    lead: "Tell us what you are looking for and an investment advisor will walk you through current opportunities.",
  },
  consultation: {
    eyebrow: "REIFGO Advisory",
    title: "Book a Consultation",
    lead: "Leave your details and our institutional advisory team will arrange a time to talk.",
  },
  partner: {
    eyebrow: "For Developers",
    title: "Partner With Us",
    lead: "List your projects with REIFGO and reach accredited investors worldwide. Our partnerships team will be in touch.",
  },
  waitlist: {
    eyebrow: "Digital Nexus",
    title: "Join the Waitlist",
    lead: "Be first to access the REIFGO digital platform when your region opens.",
  },
  contact: {
    eyebrow: "Contact",
    title: "Get in Touch",
    lead: "Send us a message and the right person at REIFGO will reply by email.",
  },
  // The public listing page: the lead goes to that developer's sales team.
  listing: {
    eyebrow: "Enquire",
    title: "Ask about this property",
    lead: "Leave your details and a property consultant will be in touch about availability, pricing and the payment plan.",
  },
};

const LeadModalContext = createContext(() => {});

/**
 * Opens the lead form: `const openLead = useLeadModal(); openLead("invest")`.
 * A listing enquiry passes the property: `openLead("listing", { property })`.
 */
export const useLeadModal = () => useContext(LeadModalContext);

export function LeadModalProvider({ children }) {
  const [state, setState] = useState(null);
  const open = useCallback(
    (next, context = {}) => setState({ intent: COPY[next] ? next : "contact", ...context }),
    [],
  );
  const close = useCallback(() => setState(null), []);

  return (
    <LeadModalContext.Provider value={open}>
      {children}
      {state && <LeadModal intent={state.intent} property={state.property} onClose={close} />}
    </LeadModalContext.Provider>
  );
}

const EMPTY = { name: "", email: "", phone: "", interest: INTERESTS[3], message: "" };

// The partner, contact and listing forms don't ask for an area of interest.
const asksInterest = (intent) => !["partner", "contact", "listing"].includes(intent);

export default function LeadModal({ intent, property, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const copy = COPY[intent] ?? COPY.contact;

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
  const lead = property ? `${copy.lead.replace(/\.$/, "")} for ${property.name}.` : copy.lead;

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      // Used to write to this browser's local storage only, so no request ever
      // reached the CMS. It now opens a real lead for the REIFGO team.
      await sendWebsiteLead({
        intent,
        full_name: form.name.trim(),
        email: form.email.trim(),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(property && { property_id: property.id }),
        ...(!asksInterest(intent) ? {} : { interest: form.interest }),
        ...(form.message.trim() && { message: form.message.trim() }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
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
            <p className="eyebrow">{copy.eyebrow}</p>
            <h3 className="lm__title heading">{copy.title}</h3>
            <p className="lm__lead">{lead}</p>

            <form className="lm__form" onSubmit={submit}>
              <label className="lm__field">
                <span>{intent === "partner" ? "Full name & company" : "Full name"}</span>
                <input required autoFocus maxLength={120} value={form.name} onChange={set("name")} placeholder="Your name" />
              </label>
              <div className="lm__row">
                <label className="lm__field">
                  <span>Email</span>
                  <input type="email" required maxLength={200} value={form.email} onChange={set("email")} placeholder="you@company.com" />
                </label>
                <label className="lm__field">
                  <span>Phone</span>
                  <input type="tel" maxLength={40} value={form.phone} onChange={set("phone")} placeholder="+971 …" />
                </label>
              </div>
              {asksInterest(intent) && (
                <label className="lm__field">
                  <span>Area of interest</span>
                  <select value={form.interest} onChange={set("interest")}>
                    {INTERESTS.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="lm__field">
                <span>{intent === "contact" ? "Message" : intent === "listing" ? "Your question (optional)" : "Anything we should know? (optional)"}</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  required={intent === "contact"}
                  value={form.message}
                  onChange={set("message")}
                  placeholder={
                    intent === "partner"
                      ? "Projects, markets, delivery timeline…"
                      : intent === "listing"
                        ? "Unit type, budget, when you'd like to buy…"
                      : intent === "contact"
                        ? "How can we help?"
                        : "Investment size, timeline, markets…"
                  }
                />
              </label>
              {error && (
                <p className="lm__error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn lm__submit" type="submit" disabled={sending}>
                {sending ? "Sending…" : "Submit request"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
