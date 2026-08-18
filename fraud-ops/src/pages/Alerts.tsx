import { useState } from 'react'
import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import AlertTable from '../components/AlertTable'
import { ErrorState } from '../components/EmptyState'
import { usePolling } from '../hooks/usePolling'
import { acknowledgeAlert, listAlerts, resolveAlert } from '../api/alerts'
import { getSystemStatus } from '../api/system'

export default function Alerts() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'HIGH' | 'CRITICAL'>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const status = usePolling(getSystemStatus, 15000)
  const alerts = usePolling(
    () => listAlerts({ status: statusFilter, severity: severityFilter }),
    7000,
    [statusFilter, severityFilter]
  )

  const alertList = alerts.data ?? []
  const openCount = alertList.filter((a) => a.status.toUpperCase() === 'OPEN').length

  async function handleAcknowledge(id: string) {
    setBusyId(id)
    setActionError(null)
    try {
      await acknowledgeAlert(id)
      await alerts.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to acknowledge alert.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleResolve(id: string) {
    setBusyId(id)
    setActionError(null)
    try {
      await resolveAlert(id)
      await alerts.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to resolve alert.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Alerts"
        subtitle={`${openCount} open fraud alert${openCount === 1 ? '' : 's'}`}
        status={status.data}
        lastUpdated={alerts.lastUpdated}
        onRefresh={alerts.refresh}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-[var(--color-line-200)] rounded-[3px] overflow-hidden">
              {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`h-8 px-2.5 sm:px-3 text-[11.5px] font-medium border-r border-[var(--color-line-200)] last:border-r-0 ${
                    statusFilter === st
                      ? 'bg-[var(--color-ink-900)] text-white'
                      : 'bg-[var(--color-surface-1)] text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center border border-[var(--color-line-200)] rounded-[3px] overflow-hidden">
              {(['ALL', 'HIGH', 'CRITICAL'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`h-8 px-2.5 sm:px-3 text-[11.5px] font-medium border-r border-[var(--color-line-200)] last:border-r-0 ${
                    severityFilter === sev
                      ? 'bg-[var(--color-ink-900)] text-white'
                      : 'bg-[var(--color-surface-1)] text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {sev === 'ALL' ? 'All Severities' : sev.charAt(0) + sev.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <span className="text-[11.5px] text-[var(--color-ink-400)] sm:ml-auto">{alertList.length} alerts</span>
        </div>

        {actionError && (
          <div className="border border-[var(--color-risk-critical-line)] bg-[var(--color-risk-critical-bg)] text-[var(--color-risk-critical)] text-[12px] px-3 py-2 rounded-[3px]">
            {actionError}
          </div>
        )}

        <Panel padded={false}>
          {alerts.error && alertList.length === 0 ? (
            <ErrorState message={alerts.error} onRetry={alerts.refresh} />
          ) : (
            <AlertTable
              alerts={alertList}
              loading={alerts.loading}
              busyId={busyId}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}
