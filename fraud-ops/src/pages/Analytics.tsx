import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import MetricStrip from '../components/MetricStrip'
import RiskDistributionBar from '../components/RiskDistributionBar'
import RiskTrendChart from '../components/RiskTrendChart'
import { EmptyState, ErrorState } from '../components/EmptyState'
import { usePolling } from '../hooks/usePolling'
import { getAnalytics } from '../api/analytics'
import { getSystemStatus } from '../api/system'
import { formatCurrency, formatPercent, formatScore } from '../lib/format'

const axisStyle = { fontSize: 10, fill: 'var(--color-ink-400)' }

export default function Analytics() {
  const status = usePolling(getSystemStatus, 20000)
  const analytics = usePolling(getAnalytics, 15000)
  const a = analytics.data

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Analytics" subtitle="Portfolio-level fraud risk reporting" status={status.data} lastUpdated={analytics.lastUpdated} onRefresh={analytics.refresh} />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 space-y-4 sm:space-y-5">
        {analytics.error && !a ? (
          <ErrorState message={analytics.error} onRetry={analytics.refresh} />
        ) : (
          <>
            <MetricStrip
              metrics={[
                { label: 'Total Transactions', value: a?.total_transactions ?? '—' },
                { label: 'Fraud Rate', value: a ? formatPercent(a.fraud_rate) : '—', tone: 'var(--color-risk-high)' },
                { label: 'Critical Count', value: a?.critical_count ?? '—', tone: 'var(--color-risk-critical)' },
                { label: 'Avg. Risk Score', value: a ? formatScore(a.average_risk_score) : '—' },
                { label: 'Avg. Transaction Amount', value: a ? formatCurrency(a.average_transaction_amount) : '—' },
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <Panel title="Risk Distribution">
                <RiskDistributionBar distribution={a?.risk_distribution ?? {}} />
              </Panel>

              <Panel title="Fraud Probability Distribution">
                {a?.fraud_probability_distribution && a.fraud_probability_distribution.length > 0 ? (
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                      <BarChart data={a.fraud_probability_distribution} margin={{ left: -18, right: 8, top: 6 }}>
                        <CartesianGrid vertical={false} stroke="var(--color-line-100)" />
                        <XAxis dataKey="bucket" tick={axisStyle} axisLine={{ stroke: 'var(--color-line-100)' }} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 3, border: '1px solid var(--color-line-200)' }} />
                        <Bar dataKey="count" fill="var(--color-accent-600)" radius={[1, 1, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No fraud probability distribution reported." />
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <Panel title="Transaction Volume">
                {a?.transaction_volume && a.transaction_volume.length > 0 ? (
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                      <BarChart data={a.transaction_volume} margin={{ left: -18, right: 8, top: 6 }}>
                        <CartesianGrid vertical={false} stroke="var(--color-line-100)" />
                        <XAxis dataKey="time" tick={axisStyle} axisLine={{ stroke: 'var(--color-line-100)' }} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 3, border: '1px solid var(--color-line-200)' }} />
                        <Bar dataKey="count" fill="var(--color-ink-700)" radius={[1, 1, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No transaction volume data reported." />
                )}
              </Panel>

              <Panel title="Risk Score Over Time">
                <RiskTrendChart data={a?.risk_score_over_time ?? []} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <Panel title="Top Fraud Indicators" padded={false}>
                {a?.top_fraud_indicators && a.top_fraud_indicators.length > 0 ? (
                  <ul className="divide-y divide-[var(--color-line-100)]">
                    {a.top_fraud_indicators.map((f) => (
                      <li key={f.name} className="flex items-center justify-between px-4 py-2 text-[12.5px]">
                        <span className="text-[var(--color-ink-800)]">{f.name}</span>
                        <span className="font-semibold tabular text-[var(--color-ink-900)]">{f.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4">
                    <EmptyState message="No fraud indicators reported." />
                  </div>
                )}
              </Panel>

              <Panel title="Top SHAP Features" padded={false}>
                {a?.top_shap_features && a.top_shap_features.length > 0 ? (
                  <ul className="divide-y divide-[var(--color-line-100)]">
                    {a.top_shap_features.map((f) => (
                      <li key={f.feature} className="flex items-center justify-between px-4 py-2 text-[12.5px]">
                        <span className="text-[var(--color-ink-800)]">{f.feature}</span>
                        <span
                          className="font-semibold tabular"
                          style={{ color: f.avg_contribution >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                        >
                          {f.avg_contribution >= 0 ? '+' : ''}
                          {f.avg_contribution.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4">
                    <EmptyState message="No SHAP feature summary reported." />
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
