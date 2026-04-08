import { ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GrowthMatrixProps {
  thisMonthRevenue: number
  lastMonthRevenue: number
  newLeadsThisMonth: number
  newLeadsLastMonth: number
  conversionRate: number
  winRate: number | null
  avgSale: number
  prevAvgSale: number
  activeClients: number
  totalClients: number
  currentYear: number
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function MetricCard({
  label,
  value,
  unit = '',
  previous,
  subLabel,
}: {
  label: string
  value: string | number
  unit?: string
  previous?: number
  subLabel?: string
}) {
  const change = typeof previous === 'number' ? pct(parseFloat(String(value)), previous) : null
  const isPositive = change !== null && change >= 0

  return (
    <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card p-4">
      <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
          {value}{unit}
        </p>
        {change !== null && (
          <div className="flex items-center gap-1">
            {isPositive ? (
              <ArrowUp className="size-4 text-emerald-600" />
            ) : (
              <ArrowDown className="size-4 text-red-500" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      {subLabel && <p className="text-xs text-gray-400 dark:text-muted-foreground mt-2">{subLabel}</p>}
    </div>
  )
}

export function GrowthMatrix({
  thisMonthRevenue,
  lastMonthRevenue,
  newLeadsThisMonth,
  newLeadsLastMonth,
  conversionRate,
  winRate,
  avgSale,
  prevAvgSale,
  activeClients,
  totalClients,
}: GrowthMatrixProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground mb-4">Growth Matrix</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Revenue */}
        <MetricCard
          label="Revenue (This Month)"
          value={formatCurrency(thisMonthRevenue)}
          previous={lastMonthRevenue}
          subLabel={`vs ${formatCurrency(lastMonthRevenue)} last month`}
        />

        {/* New Leads */}
        <MetricCard
          label="New Leads"
          value={newLeadsThisMonth}
          previous={newLeadsLastMonth}
          subLabel={`vs ${newLeadsLastMonth} leads last month`}
        />

        {/* Conversion Rate */}
        <MetricCard
          label="Conversion Rate"
          value={conversionRate}
          unit="%"
          subLabel="(Active + Completed) / Total"
        />

        {/* Win Rate */}
        <MetricCard
          label="Win Rate"
          value={winRate !== null ? winRate : '—'}
          unit={winRate !== null ? '%' : ''}
          subLabel="Completed / (Completed + Churned)"
        />

        {/* Avg Deal Size */}
        <MetricCard
          label="Avg Deal Size"
          value={formatCurrency(avgSale)}
          previous={prevAvgSale}
          subLabel={`vs ${formatCurrency(prevAvgSale)} last month`}
        />

        {/* Active Clients */}
        <MetricCard
          label="Active Clients"
          value={activeClients}
          subLabel={`of ${totalClients} total clients`}
        />
      </div>
    </div>
  )
}
