import TopBar from '../components/TopBar'
import MetricStrip from '../components/MetricStrip'
import Panel from '../components/Panel'
import TransactionTable from '../components/TransactionTable'
import RiskDistributionBar from '../components/RiskDistributionBar'
import RiskTrendChart from '../components/RiskTrendChart'
import { ErrorState } from '../components/EmptyState'
import { usePolling } from '../hooks/usePolling'
import { getDashboardStats } from '../api/dashboard'
import { getRecentTransactions } from '../api/transactions'
import { getSystemStatus } from '../api/system'
import { useNavigate } from 'react-router-dom'

export default function Overview() {
  const navigate = useNavigate()
  const stats = usePolling(getDashboardStats, 8000)
  const recent = usePolling(getRecentTransactions, 8000)
  const status = usePolling(getSystemStatus, 10000)

  const s = stats.data

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Fraud Operations"
        subtitle="Real-time payment risk monitoring"
        status={status.data}
        lastUpdated={stats.lastUpdated}
        onRefresh={() => {
          stats.refresh()
          recent.refresh()
          status.refresh()
        }}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 space-y-4 sm:space-y-5">
        {stats.error && !s ? (
          <ErrorState message={stats.error} onRetry={stats.refresh} />
        ) : (
          <MetricStrip
            metrics={[
              { label: 'Transactions Today', value: s?.total_transactions ?? '—' },
              { label: 'High Risk', value: s?.high_risk ?? '—', tone: 'var(--color-risk-high)' },
              { label: 'Critical', value: s?.critical_risk ?? '—', tone: 'var(--color-risk-critical)' },
              { label: 'Open Alerts', value: s?.open_alerts ?? '—', tone: 'var(--color-risk-medium)' },
            ]}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <Panel
            title="Live Transaction Activity"
            className="col-span-1 lg:col-span-2"
            padded={false}
            action={
              <button
                onClick={() => navigate('/transactions')}
                className="text-[11px] font-medium text-[var(--color-accent-600)] hover:underline"
              >
                View all
              </button>
            }
          >
            <TransactionTable transactions={recent.data ?? []} loading={recent.loading} compact />
          </Panel>

          <Panel title="Risk Distribution">
            <RiskDistributionBar distribution={s?.risk_distribution ?? {}} />
          </Panel>
        </div>

        <Panel title="Recent Risk Activity">
          <RiskTrendChart data={s?.risk_trend ?? []} />
        </Panel>
      </div>
    </div>
  )
}
