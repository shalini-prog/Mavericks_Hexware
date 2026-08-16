import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "./StateBlock";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="shap-tooltip">
      <div className="shap-tooltip-feature mono">{label}</div>
      <div>Risk score: {Number(payload[0].value).toFixed(2)}</div>
    </div>
  );
}

export default function RiskTrendChart({ data, height = 240 }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No trend data" message="Risk trend will appear as transactions stream in." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="riskTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "var(--border-subtle)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="risk_score"
          stroke="var(--accent-cyan)"
          strokeWidth={2}
          fill="url(#riskTrendGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
