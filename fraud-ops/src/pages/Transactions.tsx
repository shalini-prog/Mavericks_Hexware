import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import TransactionTable from '../components/TransactionTable'
import { ErrorState } from '../components/EmptyState'
import { usePolling } from '../hooks/usePolling'
import { listTransactions } from '../api/transactions'
import { getSystemStatus } from '../api/system'
import { RISK_LEVELS } from '../lib/risk'
import type { RiskLevel } from '../types'

const PAGE_SIZE = 25

export default function Transactions() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => setPage(1), [riskFilter, debouncedSearch])

  const status = usePolling(getSystemStatus, 15000)
  const txs = usePolling(
    () => listTransactions({ risk_level: riskFilter, search: debouncedSearch, page, page_size: PAGE_SIZE }),
    9000,
    [riskFilter, debouncedSearch, page]
  )

  const data = txs.data ?? []

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Transactions" subtitle="Full transaction history and risk detail" status={status.data} lastUpdated={txs.lastUpdated} onRefresh={txs.refresh} />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID…"
            className="h-8 w-full sm:w-72 px-3 rounded-[3px] border border-[var(--color-line-200)] bg-[var(--color-surface-1)] text-[12.5px] focus:outline-none focus:border-[var(--color-accent-500)] focus:ring-1 focus:ring-[var(--color-accent-500)]"
          />

          <div className="flex flex-wrap items-center border border-[var(--color-line-200)] rounded-[3px] overflow-hidden">
            {(['ALL', ...RISK_LEVELS] as const).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`h-8 px-2.5 sm:px-3 text-[11.5px] font-medium border-r border-[var(--color-line-200)] last:border-r-0 ${
                  riskFilter === level
                    ? 'bg-[var(--color-ink-900)] text-white'
                    : 'bg-[var(--color-surface-1)] text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)]'
                }`}
              >
                {level === 'ALL' ? 'All' : level.charAt(0) + level.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <span className="text-[11.5px] text-[var(--color-ink-400)] sm:ml-auto">{data.length} shown</span>
        </div>

        <Panel padded={false}>
          {txs.error && data.length === 0 ? (
            <ErrorState message={txs.error} onRetry={txs.refresh} />
          ) : (
            <TransactionTable transactions={data} loading={txs.loading} />
          )}
        </Panel>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-[11.5px] font-medium px-2.5 py-1.5 rounded-[3px] border border-[var(--color-line-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[11.5px] text-[var(--color-ink-400)]">Page {page}</span>
          <button
            onClick={() => setPage((p) => (data.length < PAGE_SIZE ? p : p + 1))}
            disabled={data.length < PAGE_SIZE}
            className="text-[11.5px] font-medium px-2.5 py-1.5 rounded-[3px] border border-[var(--color-line-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
