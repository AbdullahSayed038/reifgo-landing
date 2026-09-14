import { useEffect, useState } from "react";

// Shown under a loading skeleton only once the wait is noticeable. The shared
// backend sleeps when idle, so a first visit can take up to a minute; saying
// so beats grey bars that look broken.
export default function SlowLoadingNote({ after = 5000 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), after);
    return () => clearTimeout(timer);
  }, [after]);

  if (!show) return null;
  return (
    <p className="slow-note" role="status">
      Still loading — the server is waking up, which can take a few moments on a
      first visit.
    </p>
  );
}
