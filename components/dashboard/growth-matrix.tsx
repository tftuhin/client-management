'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, TrendingUp, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GrowthMatrixProps {
  thisMonthRevenue: number
  lastMonthRevenue: number
  thisMonthSales: number
  lastMonthSales: number
  sameMonthLastYearRevenue: number
  sameMonthLastYearSales: number
  newLeadsThisMonth: number
  newLeadsLastMonth: number
  newLeadsSameMonthLastYear: number
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
  currentMonthName: string
}

interface Comparison {
  label: string
  change: number | null
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function MetricCard({
  label,
  value,
  unit = '',
  subLabel,
  comparisons = [],
}: {
  label: string
  value: string | number
  unit?: string
  subLabel?: string
  comparisons?: Comparison[]
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card p-4">
      <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">{label}</p>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
          {value}{unit}
        </p>
      </div>

      {/* Comparisons */}
      {comparisons.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {comparisons.map((comp, idx) => {
            const isPositive = comp.change !== null && comp.change >= 0
            return (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-400 dark:text-muted-foreground">{comp.label}</span>
                {comp.change !== null ? (
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <ArrowUp className="size-3 text-emerald-600" />
                    ) : (
                      <ArrowDown className="size-3 text-red-500" />
                    )}
                    <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {comp.change >= 0 ? '+' : ''}{comp.change.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-300 dark:text-muted-foreground/50">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {subLabel && <p className="text-xs text-gray-400 dark:text-muted-foreground">{subLabel}</p>}
    </div>
  )
}

export function GrowthMatrix({
  thisMonthRevenue,
  lastMonthRevenue,
  thisMonthSales,
  lastMonthSales,
  sameMonthLastYearRevenue,
  sameMonthLastYearSales,
  newLeadsThisMonth,
  newLeadsLastMonth,
  newLeadsSameMonthLastYear,
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
  currentMonthName,
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
          {/* Revenue This Month */}
          <MetricCard
            label={`Revenue ${currentMonthName}`}
            value={formatCurrency(thisMonthRevenue)}
            comparisons={[
              { label: 'vs prev month', change: pct(thisMonthRevenue, lastMonthRevenue) },
              { label: 'vs last year', change: pct(thisMonthRevenue, sameMonthLastYearRevenue) },
            ]}
            subLabel={`${currentMonthName} ${currentYear}`}
          />

          {/* Sales Count This Month */}
          <MetricCard
            label={`Sales ${currentMonthName}`}
            value={thisMonthSales}
            comparisons={[
              { label: 'vs prev month', change: pct(thisMonthSales, lastMonthSales) },
              { label: 'vs last year', change: pct(thisMonthSales, sameMonthLastYearSales) },
            ]}
            subLabel={`${currentMonthName} ${currentYear}`}
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
                comparisons={[
                  { label: 'vs prev month', change: pct(thisMonthRevenue, lastMonthRevenue) },
                  { label: 'vs last year', change: pct(thisMonthRevenue, sameMonthLastYearRevenue) },
                ]}
                subLabel={`${currentMonthName} ${currentYear}`}
              />

              {/* New Leads */}
              <MetricCard
                label="New Leads"
                value={newLeadsThisMonth}
                comparisons={[
                  { label: 'vs prev month', change: pct(newLeadsThisMonth, newLeadsLastMonth) },
                  { label: 'vs last year', change: pct(newLeadsThisMonth, newLeadsSameMonthLastYear) },
                ]}
                subLabel={`${currentMonthName} ${currentYear}`}
              />

              {/* Lead Velocity */}
              <MetricCard
                label="Lead Velocity"
                value={leadVelocity !== null ? leadVelocity : '—'}
                unit={leadVelocity !== null ? '%' : ''}
                subLabel="MoM growth rate"
              />

              {/* Avg Deal Size */}
              <MetricCard
                label="Avg Deal Size"
                value={formatCurrency(avgSale)}
                comparisons={[
                  { label: 'vs prev month', change: pct(avgSale, avgSale > 0 ? (lastMonthRevenue > 0 ? lastMonthRevenue / lastMonthSales : 0) : 0) },
                  { label: 'vs last year', change: pct(avgSale, prevAvgSale) },
                ]}
                subLabel={`${currentMonthName} ${currentYear}`}
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
                comparisons={[
                  { label: 'vs last year', change: pct(totalSales > 0 ? totalRevenue / totalSales : 0, lastSales > 0 ? lastRevenue / lastSales : 0) },
                ]}
                subLabel="YoY comparison"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
