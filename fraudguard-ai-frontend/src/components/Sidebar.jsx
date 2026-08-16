import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, ShieldAlert, BarChart3, ShieldHalf } from "lucide-react";
import { useEffect, useState } from "react";
import { getSystemStatus } from "../api/api";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const DEFAULT_SYSTEMS = [
  { key: "kafka", label: "Kafka" },
  { key: "risk_engine", label: "Risk Engine" },
  { key: "ai_xai", label: "AI / XAI" },
  { key: "supabase", label: "Supabase" },
];

export default function Sidebar() {
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    getSystemStatus().then(({ data }) => {
      if (mounted && data) setSystemStatus(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <ShieldHalf size={18} strokeWidth={2.2} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">FraudGuard AI</span>
          <span className="sidebar-brand-subtitle">Real-Time Fraud Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <span className="sidebar-status-title">System Status</span>
        <ul className="sidebar-status-list">
          {DEFAULT_SYSTEMS.map((sys) => {
            const known = systemStatus?.[sys.key];
            const online = known === undefined ? true : Boolean(known);
            return (
              <li key={sys.key}>
                <span>{sys.label}</span>
                <span className="sidebar-status-value">
                  <span className={`status-dot ${online ? "online" : "offline"}`} />
                  {online ? "Online" : "Offline"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-footer">Real-Time Detection Platform</div>
    </aside>
  );
}
