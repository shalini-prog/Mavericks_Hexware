import { normalizeRiskLevel, RISK_LABELS } from "../utils/format";
import "./RiskGauge.css";

// Horizontal risk meter, 0–100, with LOW/MEDIUM/HIGH/CRITICAL zones.
export default function RiskGauge({ score, level }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const norm = normalizeRiskLevel(level);

  return (
    <div className="risk-gauge">
      <div className="risk-gauge-track">
        <div className="risk-gauge-zone zone-low" />
        <div className="risk-gauge-zone zone-medium" />
        <div className="risk-gauge-zone zone-high" />
        <div className="risk-gauge-zone zone-critical" />
        <div
          className={`risk-gauge-marker marker-${norm}`}
          style={{ left: `${clamped}%` }}
        >
          <div className="risk-gauge-marker-value">{clamped.toFixed(1)}</div>
        </div>
      </div>
      <div className="risk-gauge-scale">
        <span>0</span>
        <span className="risk-gauge-labels">
          <span className="lbl-low">LOW</span>
          <span className="lbl-medium">MEDIUM</span>
          <span className="lbl-high">HIGH</span>
          <span className="lbl-critical">CRITICAL</span>
        </span>
        <span>100</span>
      </div>
      <div className="risk-gauge-result">
        <span className={`risk-gauge-result-score marker-${norm}`}>{clamped.toFixed(2)}</span>
        <span className={`risk-badge risk-${norm}`} style={{ marginLeft: 10 }}>
          {RISK_LABELS[norm]}
        </span>
      </div>
    </div>
  );
}
