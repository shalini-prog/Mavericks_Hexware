import "./StatCard.css";

export default function StatCard({ label, value, icon: Icon, tone = "neutral", change, loading }) {
  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton" style={{ width: 90, height: 11, marginBottom: 14 }} />
        <div className="skeleton" style={{ width: 70, height: 26 }} />
      </div>
    );
  }

  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <span className="stat-card-icon">
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {change !== undefined && change !== null && (
        <div className={`stat-card-change ${change >= 0 ? "up" : "down"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
