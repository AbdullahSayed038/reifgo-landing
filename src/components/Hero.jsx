import { useState } from "react";
import Icon from "./Icon.jsx";
import "./Hero.css";

export default function Hero() {
  // If /homepage.mp4 is missing or fails to load, fall back to the still.
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="hero section">
      <div className="hero__grid container">
        <div className="hero__copy" data-reveal>
          <p className="eyebrow">Institutional Grade PropTech</p>

          <h1 className="hero__title heading">
            The Future of
            <br />
            Global
            <br />
            Real Estate
            <br />
            Investment
            <br />
            <span className="hero__title-muted">Starts Here.</span>
          </h1>

          <p className="hero__lead lead">
            REIFGO bridges the gap between sophisticated investors and elite
            developers through an architectural approach to financial
            technology.
          </p>

          <div className="hero__actions">
            <button className="btn">Explore Opportunities</button>
            <button className="btn btn--ghost">
              Our Methodology
              <Icon name="arrowUpRight" size={14} />
            </button>
          </div>
        </div>

        <div className="hero__media" data-reveal style={{ "--reveal-delay": "0.12s" }}>
          <div className="hero__frame">
            {videoFailed ? (
              <img src="/hero-towers.png" alt="Illuminated towers of a global financial district" />
            ) : (
              <video
                className="hero__video"
                src="/homepage.mp4"
                poster="/hero-towers.png"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Aerial view of a city business district"
                onError={() => setVideoFailed(true)}
              />
            )}
            <span className="hero__overlay" />
          </div>
        </div>
      </div>
    </section>
  );
}
