'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface DashboardFiltersProps {
  paymentType: string
  showDue: boolean
}

export function DashboardFilters({ paymentType, showDue }: DashboardFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const types = [
    { value: 'all', label: 'All Payments' },
    { value: 'one_time', label: 'One-time' },
    { value: 'recurring', label: 'Recurring' },
  ]

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Payment type tabs */}
      <div className="flex items-center rounded-lg border border-input bg-muted/40 p-0.5 gap-0.5">
        {types.map(t => (
          <button
            key={t.value}
            onClick={() => updateParam('type', t.value === 'all' ? null : t.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              paymentType === t.value || (t.value === 'all' && paymentType === 'all')
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Due invoices toggle */}
      <button
        onClick={() => updateParam('show_due', showDue ? null : '1')}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
          showDue
            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
            : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <span className={`size-1.5 rounded-full ${showDue ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
        Show Due Invoices
      </button>
    </div>
  )
}
