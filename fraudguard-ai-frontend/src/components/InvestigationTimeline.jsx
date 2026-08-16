import { Check } from "lucide-react";
import { formatDateTime } from "../utils/format";
import "./InvestigationTimeline.css";

const STAGES = [
  { key: "received_at", label: "Transaction received" },
  { key: "fraud_model_at", label: "Fraud model evaluated" },
  { key: "anomaly_at", label: "Anomaly detection completed" },
  { key: "rules_at", label: "Business rules evaluated" },
  { key: "shap_at", label: "SHAP explanation generated" },
  { key: "rag_at", label: "RAG knowledge retrieved" },
  { key: "ai_explanation_at", label: "AI explanation generated" },
  { key: "alert_at", label: "Alert created" },
];

// `timestamps` is an optional object keyed by the stage keys above. If the
// backend does not provide a timestamp for a stage, we show the stage as
// completed (since the transaction record exists) without inventing a time.
export default function InvestigationTimeline({ timestamps = {}, hasAlert = true }) {
  const stages = hasAlert ? STAGES : STAGES.filter((s) => s.key !== "alert_at");

  return (
    <ol className="timeline">
      {stages.map((stage, i) => (
        <li className="timeline-item" key={stage.key}>
          <div className="timeline-marker">
            <Check size={11} strokeWidth={3} />
          </div>
          {i < stages.length - 1 && <div className="timeline-line" />}
          <div className="timeline-content">
            <span className="timeline-label">{stage.label}</span>
            {timestamps[stage.key] && (
              <span className="timeline-time mono">{formatDateTime(timestamps[stage.key])}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
