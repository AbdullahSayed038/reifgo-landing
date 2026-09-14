import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { useLeadModal } from "../components/LeadModal.jsx";
import "./LegalPage.css";

// The footer's legal links used to go nowhere. REIFGO's legal documents are
// not written yet, so rather than invent terms, each page says so plainly and
// offers a way to ask. Replace the body with the approved text when it exists.
const DOCS = {
  privacy: {
    title: "Privacy Policy",
    body: "Our privacy policy is being finalised with our legal advisers and will be published here.",
  },
  terms: {
    title: "Terms of Service",
    body: "Our terms of service are being finalised with our legal advisers and will be published here.",
  },
  disclaimers: {
    title: "Investment Disclaimer",
    body: "Our full investment disclaimer is being finalised and will be published here. Nothing on this website is financial advice, and every investment carries risk.",
  },
  cookies: {
    title: "Cookie Policy",
    body: "Our cookie policy is being finalised and will be published here.",
  },
};

export default function LegalPage({ doc }) {
  const openLead = useLeadModal();
  const page = DOCS[doc] ?? DOCS.privacy;

  return (
    <>
      <Header active="" cta="Invest Now" />
      <main className="legal section">
        <div className="container legal__inner">
          <p className="eyebrow">Legal</p>
          <h1 className="heading legal__title">{page.title}</h1>
          <p className="legal__body">{page.body}</p>
          <p className="legal__body">
            If you have a question in the meantime, our team will answer it directly.
          </p>
          <button className="btn btn--lg" onClick={() => openLead("contact")}>
            Contact REIFGO
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
