interface Metric {
  label: string
  value: string | number
  tone?: string
  hint?: string
}

export default function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 border border-[var(--color-line-100)] bg-[var(--color-surface-1)] rounded-[3px] divide-x divide-y divide-[var(--color-line-100)] sm:divide-y-0">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="px-3 sm:px-4 py-3"
        >
          <div className="text-[10px] sm:text-[10.5px] uppercase tracking-wide text-[var(--color-ink-400)] mb-1 truncate">{m.label}</div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[18px] sm:text-[22px] font-semibold tabular leading-none" style={{ color: m.tone ?? 'var(--color-ink-900)' }}>
              {m.value}
            </span>
            {m.hint && <span className="text-[10.5px] text-[var(--color-ink-400)]">{m.hint}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
