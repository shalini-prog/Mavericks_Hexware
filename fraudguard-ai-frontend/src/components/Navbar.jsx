import { useEffect, useState } from "react";
import { Search, Bell, UserCircle2 } from "lucide-react";
import "./Navbar.css";

export default function Navbar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", { hour12: false });

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-title">FraudGuard AI</span>
        <span className="navbar-divider" />
        <span className="navbar-subtitle">Real-Time Payment Monitoring</span>
      </div>

      <div className="navbar-right">
        <span className="navbar-clock mono">
          {dateStr} · {timeStr}
        </span>

        <button className="navbar-icon-btn" aria-label="Search" title="Search">
          <Search size={16} />
        </button>
        <button className="navbar-icon-btn" aria-label="Notifications" title="Notifications">
          <Bell size={16} />
        </button>

        <span className="navbar-system-indicator" title="All systems operational">
          <span className="status-dot online" />
          Operational
        </span>

        <button className="navbar-icon-btn navbar-profile" aria-label="Profile" title="Investigator">
          <UserCircle2 size={20} />
        </button>
      </div>
    </header>
  );
}
