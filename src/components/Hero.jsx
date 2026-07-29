import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import "./Hero.css";

// Below this width the still is used instead of the footage: the clip is ~9MB,
// which isn't a fair thing to push onto a phone connection for a background.
const VIDEO_MIN_WIDTH = 768;
const NO_MOTION = "(prefers-reduced-motion: reduce)";

export default function Hero() {
  // The still is painted behind the video (and used as its poster), so the
  // banner still reads correctly whenever the footage isn't shown.
  const [videoFailed, setVideoFailed] = useState(false);
  const [allowVideo, setAllowVideo] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia(NO_MOTION);
    // Measured off innerWidth on every resize rather than trusting a single
    // mount-time media-query read: if the viewport isn't settled on first
    // paint, a one-shot read leaves the banner stuck on the still forever.
    const sync = () =>
      setAllowVideo(window.innerWidth >= VIDEO_MIN_WIDTH && !motion.matches);

    sync();
    window.addEventListener("resize", sync);
    motion.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true">
        {allowVideo && !videoFailed && (
          <video
            className="hero__video"
            src="/homepage.mp4"
            poster="/hero-towers.png"
            autoPlay
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
