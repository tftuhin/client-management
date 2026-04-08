'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { INVOICE_SOURCES } from '@/lib/constants'

interface MonthlyData {
  label: string
  bySource: Record<string, number>
  total: number
  sales: number
  mom: number | null
}

interface MonthlyBreakdownTableProps {
  monthlyData: MonthlyData[]
  activeSources: (typeof INVOICE_SOURCES)[number][]
  currentYear: number
}

function PctBadge({ v }: { v: number | null }) {
  if (v === null) return <span className="text-gray-400">—</span>
  const pos = v >= 0
  return (
    <span className={`font-medium ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {pos ? '+' : ''}{v.toFixed(1)}%
    </span>
  )
}

export function MonthlyBreakdownTable({
  monthlyData,
  activeSources,
  currentYear,
}: MonthlyBreakdownTableProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Show 3 months by default, all months when expanded
  const displayedMonths = isExpanded ? monthlyData : monthlyData.slice(-3).reverse()

  // Calculate totals
  const sourceTotals = activeSources.reduce<Record<string, number>>((acc, src) => {
    acc[src.value] = monthlyData.reduce((sum, month) => sum + (month.bySource[src.value] ?? 0), 0)
    return acc
  }, {})

  const grandTotal = monthlyData.reduce((sum, month) => sum + month.total, 0)
  const grandSales = monthlyData.reduce((sum, month) => sum + month.sales, 0)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Monthly Breakdown</h2>
          <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-border bg-white dark:bg-card px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-muted-foreground">
            {currentYear}
          </span>
        </div>
        {monthlyData.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors"
          >
            {isExpanded ? 'Show less' : 'Show all 12 months'}
            <ChevronDown
              className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-border">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
                Month
              </th>
              {activeSources.map(src => (
                <th
                  key={src.value}
                  className={`px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${src.color}`}
                >
                  {src.label}
                </th>
              ))}
              <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
                Total
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
                Sales
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
                MoM
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-border">
            {displayedMonths.map(({ label, bySource, total, sales, mom }) => (
              <tr
                key={label}
                className={`hover:bg-gray-50/50 dark:hover:bg-muted/20 ${total > 0 ? 'font-medium' : ''}`}
              >
                <td
                  className={`px-5 py-3 text-sm ${
                    total > 0
                      ? 'text-gray-900 dark:text-foreground'
                      : 'text-gray-400 dark:text-muted-foreground'
                  }`}
                >
                  {label}
                </td>
                {activeSources.map(src => (
                  <td
                    key={src.value}
                    className={`px-5 py-3 text-sm ${
                      bySource[src.value] > 0
                        ? src.color
                        : 'text-gray-300 dark:text-muted-foreground/30'
                    }`}
                  >
                    {bySource[src.value] > 0 ? formatCurrency(bySource[src.value]) : '—'}
                  </td>
                ))}
                <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">
                  {total > 0 ? formatCurrency(total) : '—'}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">{sales > 0 ? sales : '—'}</td>
                <td className="px-5 py-3 text-sm">
                  {total > 0 ? (
                    <PctBadge v={mom} />
                  ) : (
                    <span className="text-gray-300 dark:text-muted-foreground/30">—</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="border-t-2 border-gray-200 dark:border-border bg-gray-50/60 dark:bg-muted/20 font-semibold">
              <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">
                Total {currentYear}
              </td>
              {activeSources.map(src => (
                <td key={src.value} className={`px-5 py-3 text-sm ${src.color}`}>
                  {formatCurrency(sourceTotals[src.value] ?? 0)}
                </td>
              ))}
              <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">
                {formatCurrency(grandTotal)}
              </td>
              <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">{grandSales}</td>
              <td className="px-5 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
