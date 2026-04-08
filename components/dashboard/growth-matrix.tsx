'use client'

import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, Minus, TrendingUp, ChevronDown } from 'lucide-react'
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
  prevMonthAvgSale: number
  activeClients: number
  totalClients: number
  currentYear: number
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

function ComparisonBadge({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="text-gray-300 text-xs">—</span>
  }

  const isPositive = change > 0
  const isNeutral = change === 0

  if (isNeutral) {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Minus className="size-3" />
        {change.toFixed(1)}%
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold ${
      isPositive
        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
    }`}>
      {isPositive ? (
        <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3" />
      )}
      {change > 0 ? '+' : ''}{change.toFixed(1)}%
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  valueColor?: 'emerald' | 'blue' | 'violet' | 'default'
  subLabel?: string
  comparisons?: Comparison[]
}

const MetricCard = ({
  label,
  value,
  unit = '',
  valueColor = 'default',
  subLabel,
  comparisons = [],
}: MetricCardProps) => {
  const valueColorClass = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
    default: 'text-gray-900 dark:text-foreground',
  }[valueColor]

  const borderColor = {
    emerald: 'border-t-emerald-500',
    blue: 'border-t-blue-500',
    violet: 'border-t-violet-500',
    default: '',
  }[valueColor]

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card p-4 ${borderColor ? `border-t-2 ${borderColor}` : ''}`}>
      <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">{label}</p>
      <p className={`text-2xl font-bold mb-3 ${valueColorClass}`}>
        {value}{unit}
      </p>

      {/* Comparisons */}
      {comparisons.length > 0 && (
        <div className="space-y-2 mb-3">
          {comparisons.map((comp, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 dark:text-muted-foreground">{comp.label}</span>
              <ComparisonBadge change={comp.change} />
            </div>
          ))}
        </div>
      )}

      {subLabel && <p className="text-xs text-gray-400 dark:text-muted-foreground">{subLabel}</p>}
    </div>
  )
}

// Wrap in memo for performance
const MemoizedMetricCard = (props: MetricCardProps) => <MetricCard {...props} />

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
  prevMonthAvgSale,
  activeClients,
  totalClients,
  currentYear,
  totalRevenue,
  lastRevenue,
  totalSales,
  lastSales,
  pipelineValue,
  leadVelocity,
  currentMonthName,
}: GrowthMatrixProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Memoize all comparisons to avoid re-creating arrays on every render
  const memoizedComparisons = useMemo(
    () => ({
      revenueComparisons: [
        { label: 'vs prev month', change: pct(thisMonthRevenue, lastMonthRevenue) },
        { label: 'vs last year', change: pct(thisMonthRevenue, sameMonthLastYearRevenue) },
      ],
      salesComparisons: [
        { label: 'vs prev month', change: pct(thisMonthSales, lastMonthSales) },
        { label: 'vs last year', change: pct(thisMonthSales, sameMonthLastYearSales) },
      ],
      leadsComparisons: [
        { label: 'vs prev month', change: pct(newLeadsThisMonth, newLeadsLastMonth) },
        { label: 'vs last year', change: pct(newLeadsThisMonth, newLeadsSameMonthLastYear) },
      ],
      avgSaleComparisons: [
        { label: 'vs prev month', change: pct(avgSale, prevMonthAvgSale) },
        { label: 'vs last year', change: pct(avgSale, prevAvgSale) },
      ],
      avgSaleYoyComparisons: [
        { label: 'vs last year', change: pct(totalSales > 0 ? totalRevenue / totalSales : 0, lastSales > 0 ? lastRevenue / lastSales : 0) },
      ],
    }),
    [
      thisMonthRevenue,
      lastMonthRevenue,
      sameMonthLastYearRevenue,
      thisMonthSales,
      lastMonthSales,
      sameMonthLastYearSales,
      newLeadsThisMonth,
      newLeadsLastMonth,
      newLeadsSameMonthLastYear,
      avgSale,
      prevMonthAvgSale,
      prevAvgSale,
      totalRevenue,
      totalSales,
      lastRevenue,
      lastSales,
    ]
  )

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6 space-y-6">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">
          Growth Matrix {!isExpanded && <span className="text-gray-500 font-normal ml-1">— {currentMonthName} {currentYear}</span>}
        </h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Revenue This Month */}
          <MemoizedMetricCard
            label={`Revenue ${currentMonthName}`}
            value={formatCurrency(thisMonthRevenue)}
            valueColor="emerald"
            comparisons={memoizedComparisons.revenueComparisons}
            subLabel={`${currentMonthName} ${currentYear}`}
          />

          {/* Sales Count This Month */}
          <MemoizedMetricCard
            label={`Sales ${currentMonthName}`}
            value={thisMonthSales}
            valueColor="blue"
            comparisons={memoizedComparisons.salesComparisons}
            subLabel={`${currentMonthName} ${currentYear}`}
          />

          {/* Active Clients */}
          <MemoizedMetricCard
            label="Active Clients"
            value={activeClients}
            subLabel={`of ${totalClients} total clients`}
          />

          {/* Conversion Rate */}
          <MemoizedMetricCard
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
              {/* New Leads */}
              <MemoizedMetricCard
                label="New Leads"
                value={newLeadsThisMonth}
                valueColor="violet"
                comparisons={memoizedComparisons.leadsComparisons}
                subLabel={`${currentMonthName} ${currentYear}`}
              />

              {/* Lead Velocity */}
              <MemoizedMetricCard
                label="Lead Velocity"
                value={leadVelocity !== null ? leadVelocity : '—'}
                unit={leadVelocity !== null ? '%' : ''}
                subLabel="MoM growth rate"
              />

              {/* Avg Deal Size */}
              <MemoizedMetricCard
                label="Avg Deal Size"
                value={formatCurrency(avgSale)}
                comparisons={memoizedComparisons.avgSaleComparisons}
                subLabel={`${currentMonthName} ${currentYear}`}
              />
            </div>
          </div>

          {/* Pipeline & Success Metrics */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Pipeline & Success</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Win Rate */}
              <MemoizedMetricCard
                label="Win Rate"
                value={winRate !== null ? winRate : '—'}
                unit={winRate !== null ? '%' : ''}
                subLabel="Completed / (Completed + Churned)"
              />

              {/* Churn Rate */}
              <MemoizedMetricCard
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Pipeline Value */}
              <MemoizedMetricCard
                label="Pipeline Value"
                value={formatCurrency(pipelineValue)}
                subLabel="From upcoming offers"
              />

              {/* Average YoY Sale Value */}
              <MemoizedMetricCard
                label="Avg Sale Value"
                value={formatCurrency(totalSales > 0 ? totalRevenue / totalSales : 0)}
                comparisons={memoizedComparisons.avgSaleYoyComparisons}
                subLabel="YoY comparison"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
