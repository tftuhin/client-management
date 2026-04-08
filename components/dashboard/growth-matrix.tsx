'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, TrendingUp, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GrowthMatrixProps {
  thisMonthRevenue: number
  lastMonthRevenue: number
  newLeadsThisMonth: number
  newLeadsLastMonth: number
  conversionRate: number
  winRate: number | null
  churnRate: number | null
  avgSale: number
  prevAvgSale: number
  activeClients: number
  totalClients: number
  currentYear: number
  prevYear: number
  totalRevenue: number
  lastRevenue: number
  totalSales: number
  lastSales: number
  pipelineValue: number
  leadVelocity: number | null
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
  trend,
}: {
  label: string
  value: string | number
  unit?: string
  previous?: number
  subLabel?: string
  trend?: number | null
}) {
  const change = typeof previous === 'number' ? pct(parseFloat(String(value)), previous) : (trend ?? null)
  const isPositive = change !== null && change !== undefined && change >= 0

  return (
    <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card p-4">
      <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
          {value}{unit}
        </p>
        {change !== null ? (
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
        ) : (
          <TrendingUp className="size-4 text-gray-300" />
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
  churnRate,
  avgSale,
  prevAvgSale,
  activeClients,
  totalClients,
  currentYear,
  prevYear,
  totalRevenue,
  lastRevenue,
  totalSales,
  lastSales,
  pipelineValue,
  leadVelocity,
}: GrowthMatrixProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6 space-y-6">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Growth Matrix</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show all metrics'}
          <ChevronDown
            className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Key Metrics (Always visible - collapsed state) */}
      <div>
        {!isExpanded && <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Key Metrics</h3>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* YoY Revenue */}
          <MetricCard
            label={`Revenue ${currentYear}`}
            value={formatCurrency(totalRevenue)}
            previous={lastRevenue}
            subLabel={`vs ${formatCurrency(lastRevenue)} in ${prevYear}`}
          />

          {/* YoY Sales Count */}
          <MetricCard
            label={`Sales Count ${currentYear}`}
            value={totalSales}
            previous={lastSales}
            subLabel={`vs ${lastSales} in ${prevYear}`}
          />

          {/* Active Clients */}
          <MetricCard
            label="Active Clients"
            value={activeClients}
            subLabel={`of ${totalClients} total clients`}
          />

          {/* Conversion Rate */}
          <MetricCard
            label="Conversion Rate"
            value={conversionRate}
            unit="%"
            subLabel="(Active + Completed) / Total"
          />
        </div>
      </div>

      {/* Expanded View - All Metrics */}
      {isExpanded && (
        <>
          {/* Growth Matrix - Monthly Metrics */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Growth Metrics (Monthly)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Revenue MoM */}
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

              {/* Lead Velocity */}
              <MetricCard
                label="Lead Velocity"
                value={leadVelocity !== null ? leadVelocity : '—'}
                unit={leadVelocity !== null ? '%' : ''}
                trend={leadVelocity}
                subLabel="MoM growth rate"
              />

              {/* Avg Deal Size */}
              <MetricCard
                label="Avg Deal Size"
                value={formatCurrency(avgSale)}
                previous={prevAvgSale}
                subLabel={`vs ${formatCurrency(prevAvgSale)} last month`}
              />
            </div>
          </div>

          {/* Pipeline & Success Metrics */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Pipeline & Success</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Win Rate */}
              <MetricCard
                label="Win Rate"
                value={winRate !== null ? winRate : '—'}
                unit={winRate !== null ? '%' : ''}
                subLabel="Completed / (Completed + Churned)"
              />

              {/* Churn Rate */}
              <MetricCard
                label="Churn Rate"
                value={churnRate !== null ? churnRate : '—'}
                unit={churnRate !== null ? '%' : ''}
                subLabel="Lost deals"
              />
            </div>
          </div>

          {/* Year over Year Comparison */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Additional YoY Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Pipeline Value */}
              <MetricCard
                label="Pipeline Value"
                value={formatCurrency(pipelineValue)}
                subLabel="From upcoming offers"
              />

              {/* Average YoY Sale Value */}
              <MetricCard
                label="Avg Sale Value"
                value={formatCurrency(totalSales > 0 ? totalRevenue / totalSales : 0)}
                previous={lastSales > 0 ? lastRevenue / lastSales : 0}
                subLabel="YoY comparison"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
