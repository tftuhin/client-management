'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

type Sale = {
  id: string
  invoice_number: string
  title: string
  total: number
  status: string
  issue_date: string
  source: string | null
  invoice_type: string | null
  client_id: string
  clients: unknown
}

type Source = {
  value: string
  label: string
  color: string
  bg: string
  border: string
}

interface AllSalesTableProps {
  sales: Sale[]
  sources: Source[]
}

type Tab = 'all' | 'one_time' | 'recurring'

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sent: 'bg-amber-50 text-amber-700 border-amber-200',
  viewed: 'bg-amber-50 text-amber-700 border-amber-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-gray-50 text-gray-500 border-gray-200',
  cancelled: 'bg-gray-50 text-gray-400 border-gray-200',
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'completed',
  sent: 'due',
  viewed: 'due',
  partially_paid: 'partial',
  overdue: 'overdue',
  draft: 'draft',
  cancelled: 'cancelled',
}

export function AllSalesTable({ sales, sources }: AllSalesTableProps) {
  const [tab, setTab] = useState<Tab>('all')

  const filtered = sales.filter(s => {
    if (tab === 'one_time') return s.invoice_type === 'one_time' || s.invoice_type === null
    if (tab === 'recurring') return s.invoice_type === 'recurring'
    return true
  })

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'one_time', label: 'One-time' },
    { value: 'recurring', label: 'Recurring' },
  ]

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border overflow-hidden">
      {/* Header + tabs */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">All Sales</h2>
          <div className="flex items-center gap-1">
            {tabs.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  tab === t.value
                    ? 'bg-gray-900 dark:bg-foreground text-white dark:text-background'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-muted-foreground">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-border">
            {['Month', 'Client', 'Project', 'Source', 'Amount', 'Type', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-border">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-muted-foreground">
                No sales match this filter
              </td>
            </tr>
          ) : (
            filtered.map(inv => {
              const src = sources.find(s => s.value === inv.source)
              const d = new Date(inv.issue_date)
              const monthLabel = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
              const statusStyle = STATUS_STYLE[inv.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'
              const statusLabel = STATUS_LABEL[inv.status] ?? inv.status
              const typeLabel = inv.invoice_type === 'recurring' ? 'Recurring' : 'One-time'
              const typeStyle = inv.invoice_type === 'recurring'
                ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'bg-gray-50 text-gray-500 border-gray-200'

              return (
                <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/20">
                  <td className="px-5 py-3 text-sm text-gray-600 dark:text-muted-foreground">{monthLabel}</td>
                  <td className="px-5 py-3 text-sm text-gray-800 dark:text-foreground">
                    {(inv.clients as any)?.company_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 dark:text-muted-foreground max-w-[160px] truncate">{inv.title}</td>
                  <td className="px-5 py-3">
                    {src ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${src.bg} ${src.color} ${src.border}`}>
                        {src.label}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-foreground">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${typeStyle}`}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 text-xs">
                      <Link href={`/invoices/${inv.id}`} className="text-gray-500 hover:text-gray-800 dark:hover:text-foreground">
                        Edit
                      </Link>
                      <span className="text-red-400 hover:text-red-600 cursor-pointer">Delete</span>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
