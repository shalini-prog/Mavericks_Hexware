import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldCheck, ShieldAlert, ShieldX, ShieldBan, Siren, ArrowUpRight } from "lucide-react";
import StatCard from "../components/StatCard";
import RiskDistributionChart from "../components/RiskDistributionChart";
import RiskTrendChart from "../components/RiskTrendChart";
import TransactionTable from "../components/TransactionTable";
import LiveStatus from "../components/LiveStatus";
import { SkeletonCards, SkeletonPanel } from "../components/LoadingSkeleton";
import usePolling from "../hooks/usePolling";
import { getDashboardStats, getRecentTransactions } from "../api/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [txnError, setTxnError] = useState(null);
  const [txnLoading, setTxnLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [statsRes, txnRes] = await Promise.all([getDashboardStats(), getRecentTransactions(8)]);

    setStats(statsRes.data);
    setStatsError(statsRes.error);
    setStatsLoading(false);

    setTransactions(txnRes.data || []);
    setTxnError(txnRes.error);
    setTxnLoading(false);
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchAll, 5000);

  const s = stats || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <Activity size={12} /> Live Monitoring
          </div>
          <h1>Fraud Detection Dashboard</h1>
          <p className="page-subtitle">Real-time payment risk monitoring and investigation</p>
        </div>
        <LiveStatus lastUpdated={lastUpdated} />
      </div>

      {statsLoading ? (
        <SkeletonCards count={6} />
      ) : (
        <div className="stats-grid">
          <StatCard label="Total Transactions" value={(s.total_transactions ?? 0).toLocaleString("en-IN")} icon={Activity} tone="neutral" />
          <StatCard label="Low Risk" value={(s.low_risk ?? 0).toLocaleString("en-IN")} icon={ShieldCheck} tone="low" />
          <StatCard label="Medium Risk" value={(s.medium_risk ?? 0).toLocaleString("en-IN")} icon={ShieldAlert} tone="medium" />
          <StatCard label="High Risk" value={(s.high_risk ?? 0).toLocaleString("en-IN")} icon={ShieldX} tone="high" />
          <StatCard label="Critical" value={(s.critical_risk ?? 0).toLocaleString("en-IN")} icon={ShieldBan} tone="critical" />
          <StatCard label="Open Alerts" value={(s.open_alerts ?? 0).toLocaleString("en-IN")} icon={Siren} tone="blue" />
        </div>
      )}

      <div className="dashboard-charts">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Risk Distribution</h3>
              <div className="panel-subtitle">Share of transactions by risk level</div>
            </div>
          </div>
          <div className="panel-body">
            {statsLoading ? (
              <SkeletonPanel height={220} />
            ) : (
              <RiskDistributionChart
                data={
                  s.risk_distribution?.length
                    ? s.risk_distribution
                    : [
                        { name: "Low", value: s.low_risk ?? 0 },
                        { name: "Medium", value: s.medium_risk ?? 0 },
                        { name: "High", value: s.high_risk ?? 0 },
                        { name: "Critical", value: s.critical_risk ?? 0 },
                      ]
                }
              />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Risk Trend</h3>
              <div className="panel-subtitle">Transaction risk score over time</div>
            </div>
          </div>
          <div className="panel-body">
            {statsLoading ? <SkeletonPanel height={220} /> : <RiskTrendChart data={s.risk_trend || []} />}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h3>Recent Transactions</h3>
            <div className="panel-subtitle">Latest activity from the transaction stream</div>
          </div>
          <Link to="/transactions" className="btn btn-ghost btn-sm">
            View all <ArrowUpRight size={13} />
          </Link>
        </div>
        <TransactionTable
          transactions={transactions}
          loading={txnLoading}
          error={txnError}
          onRetry={refresh}
          variant="compact"
        />
      </div>
    </div>
  );
}
