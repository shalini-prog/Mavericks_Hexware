import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import RiskBadge from "./RiskBadge";
import { formatCurrency, formatPercent, formatScore, formatDateTime } from "../utils/format";
import { SkeletonTable } from "./LoadingSkeleton";
import { EmptyState, ErrorState } from "./StateBlock";

// `variant`: "compact" shows the recent-transactions column set,
// "full" shows the extended set used on the Transactions page.
export default function TransactionTable({
  transactions,
  loading,
  error,
  onRetry,
  variant = "compact",
}) {
  const navigate = useNavigate();

  if (loading) return <SkeletonTable rows={6} cols={variant === "full" ? 10 : 7} />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (!transactions || transactions.length === 0) {
    return <EmptyState title="No transactions found" message="Transactions will appear here as they stream in." />;
  }

  const goTo = (txnId) => navigate(`/transactions/${txnId}`);

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            {variant === "full" && <th>User ID</th>}
            <th>Amount</th>
            <th>Fraud Probability</th>
            {variant === "full" && (
              <>
                <th>Fraud Score</th>
                <th>Anomaly Score</th>
                <th>Rule Score</th>
              </>
            )}
            <th>Final Risk Score</th>
            <th>Risk Level</th>
            <th>{variant === "full" ? "Created At" : "Timestamp"}</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const id = txn.transaction_id || txn.id;
            return (
              <tr key={id} className="clickable" onClick={() => goTo(id)}>
                <td className="mono text-primary-col">
                  {id}
                  {txn._isMock && <span className="mock-tag">MOCK</span>}
                </td>
                {variant === "full" && <td className="mono">{txn.user_id ?? "—"}</td>}
                <td className="text-primary-col">{formatCurrency(txn.amount)}</td>
                <td>{formatPercent(txn.fraud_probability)}</td>
                {variant === "full" && (
                  <>
                    <td>{formatScore(txn.fraud_score)}</td>
                    <td>{formatScore(txn.anomaly_score)}</td>
                    <td>{formatScore(txn.rule_score)}</td>
                  </>
                )}
                <td className="mono text-primary-col">{formatScore(txn.final_risk_score)}</td>
                <td>
                  <RiskBadge level={txn.risk_level} />
                </td>
                <td>{formatDateTime(txn.created_at || txn.timestamp)}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      goTo(id);
                    }}
                  >
                    View <ArrowUpRight size={12} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
