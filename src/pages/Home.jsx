import { useEffect } from "react";
import Header from "../components/Header.jsx";
import Hero from "../components/Hero.jsx";
import About from "../components/About.jsx";
import Services from "../components/Services.jsx";
import AdvisorAI from "../components/AdvisorAI.jsx";
import MarketProfiles from "../components/MarketProfiles.jsx";
import Forum from "../components/Forum.jsx";
import Research from "../components/Research.jsx";
import FinalCta from "../components/FinalCta.jsx";
import Footer from "../components/Footer.jsx";
import { initReveal } from "../lib/reveal.js";

export default function Home() {
  useEffect(() => initReveal(), []);

  return (
    <>
      <Header active="Platform" cta="Invest Now" />
      <main>
        <Hero />
        <About />
        <Services />
        <AdvisorAI />
        <MarketProfiles />
        <Forum />
        <Research />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
