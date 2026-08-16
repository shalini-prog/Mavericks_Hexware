import { useEffect, useRef, useState, useCallback } from "react";

// Polls `fetchFn` every `intervalMs` while `active` is true.
// Returns { lastUpdated, refresh } so callers can show "Last updated Ns ago".
export default function usePolling(fetchFn, intervalMs = 5000, active = true) {
  const [lastUpdated, setLastUpdated] = useState(null);
  const savedFn = useRef(fetchFn);
  savedFn.current = fetchFn;

  const refresh = useCallback(async () => {
    await savedFn.current();
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    refresh();
    if (!active) return undefined;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, active]);

  return { lastUpdated, refresh };
}
