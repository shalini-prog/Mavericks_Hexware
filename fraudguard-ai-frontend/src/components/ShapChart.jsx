import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, Cell } from "recharts";
import { EmptyState } from "./StateBlock";
import "./ShapChart.css";

function ShapTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="shap-tooltip">
      <div className="shap-tooltip-feature mono">{d.feature}</div>
      <div className={d.shap_value >= 0 ? "positive" : "negative"}>
        {d.shap_value >= 0 ? "+" : ""}
        {d.shap_value.toFixed(4)}
      </div>
    </div>
  );
}

export default function ShapChart({ shapValues }) {
  if (!shapValues || shapValues.length === 0) {
    return <EmptyState title="No SHAP data available" message="The backend did not return feature contributions for this transaction." />;
  }

  const data = [...shapValues]
    .map((s) => ({ feature: s.feature, shap_value: Number(s.shap_value) }))
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  const height = Math.max(160, data.length * 38);

  return (
    <div className="shap-chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={["dataMin", "dataMax"]} />
          <YAxis
            type="category"
            dataKey="feature"
            width={150}
            tick={{ fill: "var(--text-secondary)", fontSize: 12, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="var(--border-strong)" />
          <Tooltip content={<ShapTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="shap_value" radius={3} barSize={16}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.shap_value >= 0 ? "var(--risk-critical)" : "var(--risk-low)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="shap-legend">
        <span className="shap-legend-item">
          <span className="shap-swatch positive" /> Positive contribution → increased fraud prediction
        </span>
        <span className="shap-legend-item">
          <span className="shap-swatch negative" /> Negative contribution → decreased fraud prediction
        </span>
      </div>
    </div>
  );
}
