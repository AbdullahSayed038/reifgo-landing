import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import "./Hero.css";

const NO_MOTION = "(prefers-reduced-motion: reduce)";

// homepage.mp4 is re-encoded for the web (1080p, ~2MB, audio stripped, moov
// atom up front) so it's light enough to play on a phone as well as desktop.
// If it is ever re-exported, compress it again before committing — the
// original master was 8.6MB at 7.4Mbps, which is far too heavy for a banner.
export default function Hero() {
  // The still is painted behind the video (and used as its poster), so the
  // banner still reads correctly whenever the footage isn't shown.
  const [videoFailed, setVideoFailed] = useState(false);
  // The one case that still gets the still rather than the footage: someone
  // who has asked their OS for reduced motion. Phones play the video.
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia(NO_MOTION);
    const sync = () => setReduceMotion(motion.matches);

    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  const showVideo = !reduceMotion && !videoFailed;

  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true">
        {showVideo && (
          <video
            className="hero__video"
            src="/homepage.mp4"
            poster="/hero-towers.png"
            autoPlay
            /* muted + playsInline are what let iOS autoplay at all; without
               both, Safari refuses and the poster is all you'd ever see. */
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
          />
        )}
        <span className="hero__tint" />
      </div>

      <div className="hero__inner container">
        <div className="hero__copy" data-reveal>
          <p className="eyebrow hero__eyebrow">Institutional Grade PropTech</p>

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
            <button className="btn btn--ghost-dark">
              Our Methodology
              <Icon name="arrowUpRight" size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
