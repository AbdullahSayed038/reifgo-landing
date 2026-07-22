import { useEffect, useRef } from "react";

// Keeps a page's data live without anyone hitting refresh: re-runs `load` on a
// fixed interval while the tab is visible, and immediately when the admin tabs
// back to it. Polling pauses while the tab is hidden so a backgrounded CMS
// isn't hammering the API.
//
// `load` should be a stable callback (wrap it in useCallback). The initial
// fetch stays in the page's own mount effect; this only handles the refreshes.
export function useAutoRefresh(load, { intervalMs = 20000 } = {}) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let timer = null;

    const tick = () => {
      // document.hidden guards the timer that fires while backgrounded.
      if (!document.hidden) loadRef.current();
    };

    const start = () => {
      if (timer == null) timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Refresh straight away on return, then resume polling.
        loadRef.current();
        start();
      }
    };

    const onFocus = () => {
      if (!document.hidden) loadRef.current();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
}
