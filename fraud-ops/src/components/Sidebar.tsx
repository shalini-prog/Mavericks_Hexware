import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/transactions', label: 'Transactions' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/analyze', label: 'Analyze Transaction' },
  { to: '/system', label: 'System Status' },
]

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const sidebarContent = (
    <div className="w-[220px] shrink-0 border-r border-[var(--color-line-100)] bg-[var(--color-surface-1)] flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-line-100)]">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 32 32" className="shrink-0">
            <path d="M16 3l11 3.8v7.6c0 7.2-4.6 12.7-11 14.7-6.4-2-11-7.5-11-14.7V6.8L16 3z" fill="var(--color-ink-900)" />
            <path d="M11.5 16.6l3 3 6.2-6.4" fill="none" stroke="var(--color-surface-1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold text-[var(--color-ink-900)]">Risk Console</div>
            <div className="text-[10px] text-[var(--color-ink-400)]">Fraud Operations</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center h-9 mx-2 px-3 rounded-[3px] text-[12.5px] transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-600)] font-medium'
                  : 'text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)]'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--color-line-100)] text-[10px] text-[var(--color-ink-400)] leading-relaxed">
        Internal use only. Transaction data is confidential.
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
          <div className="relative z-10 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
