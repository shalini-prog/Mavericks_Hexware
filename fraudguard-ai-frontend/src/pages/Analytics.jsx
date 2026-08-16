import { useCallback, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "../components/StatCard";
import RiskDistributionChart from "../components/RiskDistributionChart";
import RiskTrendChart from "../components/RiskTrendChart";
import LiveStatus from "../components/LiveStatus";
import { SkeletonCards, SkeletonPanel } from "../components/LoadingSkeleton";
import { EmptyState, ErrorState } from "../components/StateBlock";
import usePolling from "../hooks/usePolling";
import { getAnalytics } from "../api/api";
import { formatCurrency, formatPercent, formatScore } from "../utils/format";
import "./Analytics.css";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    const { data, error } = await getAnalytics();
    setData(data);
    setError(error);
    setLoading(false);
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchAll, 5000);

  const a = data || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <BarChart3 size={12} /> Platform Analytics
          </div>
          <h1>Analytics</h1>
          <p className="page-subtitle">Aggregate fraud detection performance across all transactions</p>
        </div>
        <LiveStatus lastUpdated={lastUpdated} />
      </div>

      {error && !loading && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <ErrorState onRetry={refresh} />
        </div>
      )}

      {loading ? (
        <SkeletonCards count={5} />
      ) : (
        <div className="analytics-stats-grid">
          <StatCard label="Total Transactions" value={(a.total_transactions ?? 0).toLocaleString("en-IN")} tone="neutral" />
          <StatCard label="Fraud Rate" value={formatPercent(a.fraud_rate)} tone="high" />
          <StatCard label="Critical Transactions" value={(a.critical_count ?? 0).toLocaleString("en-IN")} tone="critical" />
          <StatCard label="Avg Risk Score" value={formatScore(a.avg_risk_score)} tone="medium" />
          <StatCard label="Avg Amount" value={formatCurrency(a.avg_amount)} tone="blue" />
        </div>
      )}

      <div className="analytics-grid">
        <ChartPanel title="Risk Distribution" subtitle="Share of transactions by risk level" loading={loading}>
          <RiskDistributionChart
            data={
              a.risk_distribution || [
                { name: "Low", value: 0 },
                { name: "Medium", value: 0 },
                { name: "High", value: 0 },
                { name: "Critical", value: 0 },
              ]
            }
          />
        </ChartPanel>

        <ChartPanel title="Fraud Probability Distribution" subtitle="Transaction count by probability bucket" loading={loading}>
          <BucketBarChart data={a.fraud_probability_distribution} xKey="bucket" yKey="count" color="var(--accent-blue)" />
        </ChartPanel>

        <ChartPanel title="Transaction Volume Over Time" subtitle="Transactions processed per interval" loading={loading}>
          <BucketBarChart data={a.transaction_volume} xKey="time" yKey="count" color="var(--accent-cyan)" />
        </ChartPanel>

        <ChartPanel title="Risk Score Over Time" subtitle="Average risk score trend" loading={loading}>
          <RiskTrendChart data={a.risk_score_over_time} />
        </ChartPanel>

        <ChartPanel title="Top Fraud Indicators" subtitle="Most frequently triggered business rules" loading={loading} span>
          <HorizontalBarList data={a.top_fraud_indicators} labelKey="reason" valueKey="count" color="var(--risk-high)" />
        </ChartPanel>

        <ChartPanel title="Top SHAP Features" subtitle="Features with highest average absolute contribution" loading={loading} span>
          <HorizontalBarList data={a.top_shap_features} labelKey="feature" valueKey="avg_abs_shap" color="var(--accent-cyan)" />
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({ title, subtitle, loading, children, span }) {
  return (
    <div className={`panel${span ? " span-2" : ""}`}>
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <div className="panel-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="panel-body">{loading ? <SkeletonPanel height={220} /> : children}</div>
    </div>
  );
}

function BucketBarChart({ data, xKey, yKey, color }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No data available" message="This chart will populate once the backend provides data." />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={34} />
        <Tooltip
          contentStyle={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--text-secondary)" }}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HorizontalBarList({ data, labelKey, valueKey, color }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No data available" message="This chart will populate once the backend provides data." />;
  }
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="hbar-list">
      {data.map((d, i) => (
        <div className="hbar-row" key={i}>
          <span className="hbar-label mono">{d[labelKey]}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }} />
          </div>
          <span className="hbar-value mono">{typeof d[valueKey] === "number" ? d[valueKey].toLocaleString("en-IN") : d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
