import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

export function ErrorState({ message = "Backend connection unavailable", onRetry }) {
  return (
    <div className="state-block">
      <AlertTriangle size={30} className="state-icon" />
      <h4>Backend connection unavailable</h4>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry} style={{ marginTop: 6 }}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "No data found", message }) {
  return (
    <div className="state-block">
      <Inbox size={30} className="state-icon" />
      <h4>{title}</h4>
      {message && <p>{message}</p>}
    </div>
  );
}
