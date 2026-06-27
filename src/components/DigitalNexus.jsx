import Icon from "./Icon.jsx";
import "./DigitalNexus.css";

export default function DigitalNexus() {
  return (
    <section className="dn section">
      <div className="dn__grid container">
        <div className="dn__frame" data-reveal>
          <div className="dn__phone">
            <img src="/app-screen.png" alt="REIFGO mobile application dashboard" />
          </div>
        </div>

        <div className="dn__content" data-reveal style={{ "--reveal-delay": "0.1s" }}>
          <p className="dn__eyebrow">01. The Digital Nexus</p>
          <h2 className="dn__title">REIFGO Mobile Application</h2>

          <div className="dn__items">
            <div className="dn__item">
              <h4 className="dn__item-title">For Developers</h4>
              <p className="dn__item-body">
                Global exposure to high-net-worth capital pools. Streamlined lead
                generation through automated developer-investor matching
                algorithms.
              </p>
            </div>
            <div className="dn__item">
              <h4 className="dn__item-title">For Investors</h4>
              <p className="dn__item-body">
                Direct market discovery of institutional-grade development
                projects. Exclusive connection pipelines to accredited builders
                across emerging markets.
              </p>
            </div>
          </div>

          <a href="#" className="dn__link">
            Join the Waitlist
            <Icon name="arrowRight" size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
