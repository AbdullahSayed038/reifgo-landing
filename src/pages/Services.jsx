import { useEffect } from "react";
import Header from "../components/Header.jsx";
import ServicesHero from "../components/ServicesHero.jsx";
import DigitalNexus from "../components/DigitalNexus.jsx";
import Engagements from "../components/Engagements.jsx";
import ExecutiveAdvisory from "../components/ExecutiveAdvisory.jsx";
import ServicesCta from "../components/ServicesCta.jsx";
import ServicesFooter from "../components/ServicesFooter.jsx";
import { initReveal } from "../lib/reveal.js";

export default function Services() {
  useEffect(() => initReveal(), []);

  return (
    <>
      <Header active="Services" cta="Invest Now" />
      <main>
        <ServicesHero />
        <DigitalNexus />
        <Engagements />
        <ExecutiveAdvisory />
        <ServicesCta />
      </main>
      <ServicesFooter />
    </>
  );
}
