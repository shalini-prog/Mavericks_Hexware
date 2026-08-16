import { useState } from "react";
import { ShieldAlert, CheckCircle2, Clock3 } from "lucide-react";
import RiskBadge from "./RiskBadge";
import { formatDateTime } from "../utils/format";
import { acknowledgeAlert, resolveAlert } from "../api/api";
import "./AlertCard.css";

const STATUS_META = {
  OPEN: { icon: ShieldAlert, color: "var(--risk-critical)" },
  ACKNOWLEDGED: { icon: Clock3, color: "var(--risk-medium)" },
  RESOLVED: { icon: CheckCircle2, color: "var(--risk-low)" },
};

// `endpointsAvailable` should be set to false until the backend ships
// PATCH /api/alerts/:id/acknowledge and /resolve. Buttons stay visible but
// disabled, clearly marked "Coming soon", so we never fake functionality.
export default function AlertCard({ alert, endpointsAvailable = false, onChanged }) {
  const [busy, setBusy] = useState(false);

  if (!alert) return null;

  const status = (alert.status || "OPEN").toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  const StatusIcon = meta.icon;

  async function handle(action) {
    if (!endpointsAvailable || busy) return;
    setBusy(true);
    const fn = action === "acknowledge" ? acknowledgeAlert : resolveAlert;
    const { error } = await fn(alert.alert_id || alert.id);
    setBusy(false);
    if (!error && onChanged) onChanged();
  }

  return (
    <div className="alert-card">
      <div className="alert-card-header">
        <div className="alert-card-id-block">
          <StatusIcon size={16} color={meta.color} />
          <span className="alert-card-id mono">{alert.alert_id || alert.id}</span>
        </div>
        <RiskBadge level={alert.severity} />
      </div>

      <div className="alert-card-meta">
        <div className="alert-card-meta-item">
          <span className="alert-card-meta-label">Status</span>
          <span className="alert-card-status" style={{ color: meta.color }}>
            {status}
          </span>
        </div>
        <div className="alert-card-meta-item">
          <span className="alert-card-meta-label">Created</span>
          <span>{formatDateTime(alert.created_at)}</span>
        </div>
      </div>

      <div className="alert-card-actions">
        <button
          className="btn btn-success-outline btn-sm"
          disabled={!endpointsAvailable || busy || status !== "OPEN"}
          onClick={() => handle("acknowledge")}
          title={!endpointsAvailable ? "Coming soon — backend endpoint not available yet" : "Acknowledge alert"}
        >
          Acknowledge
        </button>
        <button
          className="btn btn-danger-outline btn-sm"
          disabled={!endpointsAvailable || busy || status === "RESOLVED"}
          onClick={() => handle("resolve")}
          title={!endpointsAvailable ? "Coming soon — backend endpoint not available yet" : "Resolve alert"}
        >
          Resolve
        </button>
        {!endpointsAvailable && <span className="alert-card-soon">Action endpoints coming soon</span>}
      </div>
    </div>
  );
}
