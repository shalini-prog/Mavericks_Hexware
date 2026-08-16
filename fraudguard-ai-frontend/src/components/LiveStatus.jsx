import { useEffect, useState } from "react";
import { timeAgo } from "../utils/format";

export default function LiveStatus({ lastUpdated }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex-row gap-12">
      <span className="live-indicator">
        <span className="live-dot" /> Live
      </span>
      {lastUpdated && (
        <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          Last updated: {timeAgo(lastUpdated)}
        </span>
      )}
    </div>
  );
}
