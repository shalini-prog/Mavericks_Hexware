import { useOutletContext } from 'react-router-dom'
import { formatTime } from '../lib/format'
import SystemStatusStrip from './SystemStatusStrip'
import type { SystemStatus } from '../types'
import type { AppShellContext } from './AppShell'

interface TopBarProps {
  title: string
  subtitle?: string
  status: SystemStatus | null
  lastUpdated: Date | null
  isLive?: boolean
  onRefresh?: () => void
}

export default function TopBar({ title, subtitle, status, lastUpdated, isLive = true, onRefresh }: TopBarProps) {
  const context = useOutletContext<AppShellContext | null>()

  return (
    <header className="min-h-[56px] py-2 shrink-0 border-b border-[var(--color-line-100)] bg-[var(--color-surface-1)] flex flex-wrap md:flex-nowrap items-center justify-between px-3 sm:px-5 gap-2">
      <div className="flex items-center gap-3">
        {context?.toggleMobileMenu && (
          <button
            onClick={context.toggleMobileMenu}
            className="md:hidden p-1.5 rounded-[3px] border border-[var(--color-line-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)]"
            aria-label="Toggle navigation menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-[13.5px] sm:text-[14px] font-semibold text-[var(--color-ink-900)] leading-tight">{title}</h1>
          {subtitle && <p className="text-[10.5px] sm:text-[11px] text-[var(--color-ink-500)] leading-tight">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-5 ml-auto">
        <div className="hidden sm:block">
          <SystemStatusStrip status={status} />
        </div>
        <div className="hidden sm:block h-4 w-px bg-[var(--color-line-100)]" />
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-medium text-[var(--color-risk-low)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-risk-low)] live-dot" />
              LIVE
            </span>
          )}
          <span className="text-[10.5px] sm:text-[11px] text-[var(--color-ink-400)] tabular hidden sm:inline">
            Last updated: {lastUpdated ? formatTime(lastUpdated.toISOString()) : '—'}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-[11px] font-medium text-[var(--color-accent-600)] hover:underline px-1.5 py-0.5"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
