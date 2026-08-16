import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Fingerprint, Radar } from "lucide-react";
import RiskBadge from "../components/RiskBadge";
import RiskGauge from "../components/RiskGauge";
import ReasonBadges from "../components/ReasonBadges";
import ShapChart from "../components/ShapChart";
import RagKnowledgeCard from "../components/RagKnowledgeCard";
import AIExplanation from "../components/AIExplanation";
import AlertCard from "../components/AlertCard";
import InvestigationTimeline from "../components/InvestigationTimeline";
import { SkeletonPanel, SkeletonLine } from "../components/LoadingSkeleton";
import { ErrorState, EmptyState } from "../components/StateBlock";
import { getTransactionById } from "../api/api";
import { formatCurrency, formatPercent, formatScore, formatDateTime } from "../utils/format";
import "./TransactionDetails.css";

export default function TransactionDetails() {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getTransactionById(transactionId);
    setTxn(data);
    setError(error);
    setLoading(false);
  }, [transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <BackLink />
        <SkeletonLine height={90} style={{ marginBottom: 20 }} />
        <div className="txn-summary-grid" style={{ marginBottom: 20 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonLine key={i} height={72} />
          ))}
        </div>
        <SkeletonPanel height={240} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <BackLink />
        <div className="panel">
          <ErrorState onRetry={load} />
        </div>
      </div>
    );
  }

  if (!txn) {
    return (
      <div>
        <BackLink />
        <div className="panel">
          <EmptyState title="Transaction not found" message={`No investigation data is available for ${transactionId}.`} />
        </div>
      </div>
    );
  }

  const id = txn.transaction_id || transactionId;
  const alert = txn.alert || null;

  return (
    <div>
      <BackLink />

      <div className="page-eyebrow">
        <Fingerprint size={12} /> Transaction Investigation
      </div>
      <h1 style={{ marginBottom: 18 }}>Transaction Investigation</h1>

      {/* Header card */}
      <div className="panel txn-header-card">
        <div className="txn-header-left">
          <span className="txn-header-id mono">{id}</span>
          <span className="txn-header-amount">{formatCurrency(txn.amount)}</span>
        </div>
        <div className="txn-header-right">
          <div className="txn-header-score">
            <span className="txn-header-score-value mono">{formatScore(txn.final_risk_score)}</span>
            <span className="txn-header-score-label">Risk Score</span>
          </div>
          <div className="txn-header-score">
            <span className="txn-header-score-value mono">{formatPercent(txn.fraud_probability)}</span>
            <span className="txn-header-score-label">Fraud Probability</span>
          </div>
          <RiskBadge level={txn.risk_level} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="txn-summary-grid">
        <SummaryCard label="Amount" value={formatCurrency(txn.amount)} />
        <SummaryCard label="Fraud Probability" value={formatPercent(txn.fraud_probability)} />
        <SummaryCard label="Fraud Score" value={formatScore(txn.fraud_score)} />
        <SummaryCard label="Anomaly Score" value={formatScore(txn.anomaly_score)} />
        <SummaryCard label="Rule Score" value={formatScore(txn.rule_score)} />
        <SummaryCard label="Final Risk Score" value={formatScore(txn.final_risk_score)} highlight />
        <SummaryCard label="Risk Level" value={<RiskBadge level={txn.risk_level} />} />
      </div>

      {/* Risk gauge */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h3>Risk Score</h3>
            <div className="panel-subtitle">Position within the 0–100 risk scale</div>
          </div>
        </div>
        <div className="panel-body">
          <RiskGauge score={txn.final_risk_score} level={txn.risk_level} />
        </div>
      </div>

      <div className="txn-two-col">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Why was this transaction flagged?</h3>
              <div className="panel-subtitle">Business rule triggers</div>
            </div>
          </div>
          <div className="panel-body">
            <ReasonBadges reasons={txn.reasons} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Investigation Timeline</h3>
              <div className="panel-subtitle">Processing pipeline stages</div>
            </div>
          </div>
          <div className="panel-body">
            <InvestigationTimeline timestamps={txn.timeline || {}} hasAlert={Boolean(alert)} />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h3>Model Explainability</h3>
            <div className="panel-subtitle">Features that influenced the XGBoost fraud prediction</div>
          </div>
        </div>
        <div className="panel-body">
          <ShapChart shapValues={txn.shap_explanations} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h3>Knowledge Used by AI</h3>
            <div className="panel-subtitle">Semantic RAG documents retrieved for this transaction</div>
          </div>
          <Radar size={16} color="var(--accent-blue)" />
        </div>
        <div className="panel-body">
          <RagKnowledgeCard ragKnowledge={txn.rag_knowledge} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h3>AI Investigation Explanation</h3>
            <div className="panel-subtitle">Generated by Groq from SHAP + RAG context</div>
          </div>
        </div>
        <div className="panel-body">
          <AIExplanation explanation={txn.ai_explanation} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Alert Information</h3>
            <div className="panel-subtitle">Associated fraud alert, if one was raised</div>
          </div>
        </div>
        <div className="panel-body">
          {alert ? (
            <AlertCard alert={alert} endpointsAvailable={false} onChanged={load} />
          ) : (
            <EmptyState title="No alert raised" message="This transaction did not generate a fraud alert." />
          )}
        </div>
      </div>

      <p className="txn-footer-note">Created {formatDateTime(txn.created_at)}</p>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/transactions" className="txn-back-link">
      <ArrowLeft size={14} /> Back to Transactions
    </Link>
  );
}

function SummaryCard({ label, value, highlight }) {
  return (
    <div className={`summary-card${highlight ? " highlight" : ""}`}>
      <span className="summary-card-label">{label}</span>
      <span className="summary-card-value">{value}</span>
    </div>
  );
}
