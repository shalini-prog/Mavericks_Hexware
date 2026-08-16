export function SkeletonLine({ width = "100%", height = 12, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonTable({ rows = 6, cols = 6 }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <SkeletonLine width={60} height={9} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <SkeletonLine width={c === 0 ? 110 : 70} height={11} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="stat-card" key={i}>
          <SkeletonLine width={90} height={11} style={{ marginBottom: 14 }} />
          <SkeletonLine width={70} height={26} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ height = 280 }) {
  return (
    <div className="panel">
      <div className="panel-body">
        <SkeletonLine height={height} />
      </div>
    </div>
  );
}
