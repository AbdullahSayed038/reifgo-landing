import { useEffect } from "react";
import AdvisorHeader from "../components/AdvisorHeader.jsx";
import AdvisorSidebar from "../components/AdvisorSidebar.jsx";
import AdvisorChat from "../components/AdvisorChat.jsx";
import AdvisorRail from "../components/AdvisorRail.jsx";
import AdvisorFooter from "../components/AdvisorFooter.jsx";
import { initReveal } from "../lib/reveal.js";
import "./Advisor.css";

export default function Advisor() {
  useEffect(() => initReveal(), []);

  return (
    <div className="adp">
      <AdvisorHeader />
      <div className="adp__body">
        <AdvisorSidebar />
        <AdvisorChat />
        <AdvisorRail />
      </div>
      <AdvisorFooter />
    </div>
  );
}
