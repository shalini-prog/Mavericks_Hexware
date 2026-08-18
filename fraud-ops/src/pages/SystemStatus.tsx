import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import { ErrorState } from '../components/EmptyState'
import { usePolling } from '../hooks/usePolling'
import { getSystemStatus } from '../api/system'
import { API_BASE_URL } from '../api/client'

const COMPONENTS: { key: string; label: string; description: string }[] = [
  { key: 'kafka', label: 'Kafka', description: 'Streaming ingestion of live payment transactions' },
  { key: 'risk_engine', label: 'Risk Engine', description: 'XGBoost fraud model, Isolation Forest anomaly detection, business rules' },
  { key: 'ai_xai', label: 'AI / XAI', description: 'SHAP explanation generation and investigator summaries (RAG + Groq)' },
  { key: 'supabase', label: 'Supabase', description: 'Transaction and alert persistence' },
]

function isUp(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['up', 'connected', 'ok', 'true', 'healthy', 'online'].includes(value.toLowerCase())
  return false
}

export default function SystemStatusPage() {
  const status = usePolling(getSystemStatus, 8000)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="System Status" subtitle="Backend connectivity" status={status.data} lastUpdated={status.lastUpdated} onRefresh={status.refresh} />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 space-y-4">
        <Panel>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-[12px]">
            <span className="text-[var(--color-ink-500)]">Backend base URL</span>
            <span className="font-mono text-[var(--color-ink-900)] break-all">{API_BASE_URL}</span>
          </div>
        </Panel>

        {status.error && !status.data ? (
          <ErrorState message={status.error} onRetry={status.refresh} />
        ) : (
          <Panel padded={false}>
            <ul className="divide-y divide-[var(--color-line-100)]">
              {COMPONENTS.map((c) => {
                const raw = status.data?.[c.key]
                const up = status.data ? isUp(raw) : undefined
                return (
                  <li key={c.key} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-2">
                    <div className="flex items-start sm:items-center gap-3">
                      <span
                        className="h-2 w-2 rounded-full mt-1.5 sm:mt-0 shrink-0"
                        style={{
                          backgroundColor:
                            up === undefined ? 'var(--color-ink-300)' : up ? 'var(--color-risk-low)' : 'var(--color-risk-critical)',
                        }}
                      />
                      <div>
                        <div className="text-[12.5px] font-medium text-[var(--color-ink-900)]">{c.label}</div>
                        <div className="text-[11px] text-[var(--color-ink-400)]">{c.description}</div>
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide self-end sm:self-auto shrink-0"
                      style={{ color: up === undefined ? 'var(--color-ink-400)' : up ? 'var(--color-risk-low)' : 'var(--color-risk-critical)' }}
                    >
                      {up === undefined ? 'Unknown' : up ? 'Connected' : 'Down'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
