import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { EmptyState } from "./StateBlock";

const COLORS = {
  LOW: "var(--risk-low)",
  MEDIUM: "var(--risk-medium)",
  HIGH: "var(--risk-high)",
  CRITICAL: "var(--risk-critical)",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="shap-tooltip">
      <div className="shap-tooltip-feature mono">{d.name}</div>
      <div>{d.value.toLocaleString("en-IN")}</div>
    </div>
  );
}

export default function RiskDistributionChart({ data, height = 240 }) {
  const chartData = (data || []).filter((d) => d.value > 0);

  if (!chartData || chartData.length === 0) {
    return <EmptyState title="No distribution data" message="Risk distribution will appear once transactions are processed." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="88%"
          paddingAngle={3}
          stroke="none"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={COLORS[entry.name?.toUpperCase()] || "var(--text-tertiary)"} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={30}
          formatter={(value) => <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
