import { useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import TransactionHeader from '../components/TransactionHeader'
import RiskBreakdown from '../components/RiskBreakdown'
import ReasonsList from '../components/ReasonsList'
import ShapContributors from '../components/ShapContributors'
import InvestigatorSummary from '../components/InvestigatorSummary'
import InvestigationTimeline from '../components/InvestigationTimeline'
import { ErrorState } from '../components/EmptyState'
import { usePolling } from '../hooks/usePolling'
import { getTransaction } from '../api/transactions'
import { getSystemStatus } from '../api/system'
import { formatDateTime } from '../lib/format'

export default function TransactionDetail() {
  const { id = '' } = useParams()
  const status = usePolling(getSystemStatus, 20000)
  const tx = usePolling(() => getTransaction(id), 10000, [id])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Transaction Investigation"
        subtitle={id}
        status={status.data}
        lastUpdated={tx.lastUpdated}
        onRefresh={tx.refresh}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 space-y-4 sm:space-y-5">
        {tx.error && !tx.data && <ErrorState message={tx.error} onRetry={tx.refresh} />}

        {tx.loading && !tx.data && (
          <div className="text-[12.5px] text-[var(--color-ink-400)] py-10 text-center">Loading transaction…</div>
        )}

        {tx.data && (
          <>
            <TransactionHeader tx={tx.data} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
              <div className="col-span-1 lg:col-span-2 space-y-4 sm:space-y-5">
                <Panel title="Transaction Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
                    <DetailRow label="Transaction ID" value={tx.data.transaction_id} mono />
                    <DetailRow label="User ID" value={tx.data.user_id} mono />
                    <DetailRow label="Timestamp" value={formatDateTime(tx.data.timestamp)} />
                    <DetailRow label="Currency" value={tx.data.currency ?? 'INR'} />
                    <DetailRow label="Average User Amount" value={tx.data.average_user_amount?.toLocaleString('en-IN') ?? '—'} />
                    <DetailRow label="Merchant Risk" value={tx.data.merchant_risk?.toFixed(2) ?? '—'} />
                    <DetailRow label="New Device" value={boolLabel(tx.data.new_device)} />
                    <DetailRow label="New Location" value={boolLabel(tx.data.new_location)} />
                    <DetailRow label="International" value={boolLabel(tx.data.international)} />
                    <DetailRow label="Distance From Home" value={tx.data.distance_from_home_km !== undefined ? `${tx.data.distance_from_home_km} km` : '—'} />
                    <DetailRow label="Account Age" value={tx.data.account_age_days !== undefined ? `${tx.data.account_age_days} days` : '—'} />
                    <DetailRow label="Device Age" value={tx.data.device_age_days !== undefined ? `${tx.data.device_age_days} days` : '—'} />
                    <DetailRow label="Unusual Hour" value={boolLabel(tx.data.unusual_hour)} />
                    <DetailRow label="Weekend" value={boolLabel(tx.data.is_weekend)} />
                  </div>
                </Panel>

                <Panel title="Risk Assessment / Detection Signals">
                  <RiskBreakdown tx={tx.data} />
                </Panel>

                <Panel title="Model Explanation">
                  <ShapContributors contributors={tx.data.shap_explanations ?? []} />
                </Panel>

                <Panel title="Business Rule Reasons">
                  <ReasonsList reasons={tx.data.reasons} />
                </Panel>

                <Panel title="AI Investigator Summary">
                  <InvestigatorSummary explanation={tx.data.ai_explanation} />
                </Panel>
              </div>

              <div className="space-y-5">
                <Panel title="Alert Status">
                  {tx.data.alert_id ? (
                    <div className="space-y-1.5 text-[12.5px]">
                      <DetailRow label="Alert ID" value={tx.data.alert_id} mono />
                      <DetailRow label="Status" value={tx.data.alert_status ?? 'OPEN'} />
                    </div>
                  ) : (
                    <p className="text-[12px] text-[var(--color-ink-400)]">No alert raised for this transaction.</p>
                  )}
                </Panel>

                <Panel title="Investigation Timeline">
                  <InvestigationTimeline timeline={tx.data.timeline} />
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function boolLabel(v: boolean | undefined) {
  if (v === undefined) return '—'
  return v ? 'Yes' : 'No'
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line-100)] pb-2">
      <span className="text-[var(--color-ink-500)]">{label}</span>
      <span className={`font-medium text-[var(--color-ink-900)] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
