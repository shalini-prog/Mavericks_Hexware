import { normalizeRiskLevel, RISK_LABELS } from "../utils/format";

export default function RiskBadge({ level, size = "md" }) {
  const norm = normalizeRiskLevel(level);
  return (
    <span
      className={`risk-badge risk-${norm}`}
      style={size === "sm" ? { fontSize: "10px", padding: "2px 8px" } : undefined}
    >
      {RISK_LABELS[norm]}
    </span>
  );
}
