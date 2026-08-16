import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowUpRight } from "lucide-react";
import RiskBadge from "../components/RiskBadge";
import LiveStatus from "../components/LiveStatus";
import { SkeletonTable } from "../components/LoadingSkeleton";
import { ErrorState, EmptyState } from "../components/StateBlock";
import usePolling from "../hooks/usePolling";
import { getAlerts } from "../api/api";
import { formatDateTime, formatScore } from "../utils/format";
import "./Alerts.css";

const STATUS_TABS = ["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"];
const SEVERITY_TABS = ["ALL", "CRITICAL", "HIGH", "MEDIUM"];

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const fetchAll = useCallback(async () => {
    const { data, error } = await getAlerts();
    setAlerts(data || []);
    setError(error);
    setLoading(false);
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchAll, 5000);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const statusOk = statusFilter === "ALL" || (a.status || "").toUpperCase() === statusFilter;
      const sevOk = severityFilter === "ALL" || (a.severity || "").toUpperCase() === severityFilter;
      return statusOk && sevOk;
    });
  }, [alerts, statusFilter, severityFilter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <ShieldAlert size={12} /> Investigation Queue
          </div>
          <h1>Alerts</h1>
          <p className="page-subtitle">Review and manage active fraud alerts</p>
        </div>
        <LiveStatus lastUpdated={lastUpdated} />
      </div>

      <div className="panel">
        <div className="alerts-filter-bar">
          <div className="alerts-tab-group">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                className={`alerts-tab${statusFilter === tab ? " active" : ""}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab === "ALL" ? "All Status" : tab}
              </button>
            ))}
          </div>
          <div className="alerts-tab-group">
            {SEVERITY_TABS.map((tab) => (
              <button
                key={tab}
                className={`alerts-tab${severityFilter === tab ? " active" : ""}`}
                onClick={() => setSeverityFilter(tab)}
              >
                {tab === "ALL" ? "All Severity" : tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : error ? (
          <ErrorState onRetry={refresh} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No active alerts" message="There are no alerts matching the selected filters." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Transaction ID</th>
                  <th>Severity</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert) => {
                  const alertId = alert.alert_id || alert.id;
                  const txnId = alert.transaction_id;
                  return (
                    <tr
                      key={alertId}
                      className="clickable"
                      onClick={() => txnId && navigate(`/transactions/${txnId}`)}
                    >
                      <td className="mono text-primary-col">{alertId}</td>
                      <td className="mono">{txnId || "—"}</td>
                      <td>
                        <RiskBadge level={alert.severity} />
                      </td>
                      <td className="mono">{formatScore(alert.risk_score)}</td>
                      <td>
                        <span className={`alert-status-pill status-${(alert.status || "open").toLowerCase()}`}>
                          {(alert.status || "OPEN").toUpperCase()}
                        </span>
                      </td>
                      <td>{formatDateTime(alert.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (txnId) navigate(`/transactions/${txnId}`);
                          }}
                          disabled={!txnId}
                        >
                          Investigate <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
