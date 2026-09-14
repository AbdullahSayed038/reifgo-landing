import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A horizontally scrolling card row driven by a pair of arrow buttons (the
 * Forum speakers and the Insights research hub). `edges` tells the arrows
 * when to disable, so they only wake up once the row actually overflows.
 *
 * Call `measure` again whenever the cards inside the track change.
 */
export default function useCarousel() {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    // Same values keep the same object, so re-measuring never loops renders.
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  });

  const step = (dir) => {
    const el = trackRef.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * (card.getBoundingClientRect().width + gap),
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return { trackRef, edges, step, measure };
}
