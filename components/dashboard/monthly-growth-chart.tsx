'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthlyChartData {
  label: string
  revenue: number
  sales: number
  mom: number | null
}

interface MonthlyGrowthChartProps {
  data: MonthlyChartData[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{data.label}</p>
      <p className="text-xs text-gray-600 dark:text-muted-foreground mt-1">
        Revenue: <span className="font-medium text-emerald-600">{formatCurrency(data.revenue)}</span>
      </p>
      <p className="text-xs text-gray-600 dark:text-muted-foreground">
        Sales: <span className="font-medium text-blue-600">{data.sales}</span>
      </p>
      {data.mom !== null && (
        <p className="text-xs text-gray-600 dark:text-muted-foreground">
          MoM: <span className={`font-medium ${data.mom >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {data.mom >= 0 ? '+' : ''}{data.mom.toFixed(1)}%
          </span>
        </p>
      )}
    </div>
  )
}

export function MonthlyGrowthChart({ data }: MonthlyGrowthChartProps) {
  // Filter to only months with data for cleaner visualization
  const dataWithRevenue = data.filter(m => m.revenue > 0)

  if (dataWithRevenue.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-border p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground mb-1">Month-to-Month Growth</h2>
        <p className="text-xs text-gray-500 dark:text-muted-foreground">Revenue and sales trends across the year</p>
      </div>

      {/* Revenue Trend */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataWithRevenue} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              interval={Math.max(0, Math.floor(dataWithRevenue.length / 8) - 1)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--color-emerald-600))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--color-emerald-600))', r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sales Count Trend */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 dark:text-muted-foreground mb-3">Sales Count Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dataWithRevenue} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              interval={Math.max(0, Math.floor(dataWithRevenue.length / 8) - 1)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar
              dataKey="sales"
              fill="hsl(var(--color-blue-600))"
              radius={[4, 4, 0, 0]}
              name="Sales Count"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 pt-3">
        <div className="rounded-lg bg-gray-50 dark:bg-muted/20 p-3">
          <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Avg Monthly Revenue</p>
          <p className="text-lg font-bold text-gray-900 dark:text-foreground">
            {formatCurrency(dataWithRevenue.reduce((sum, m) => sum + m.revenue, 0) / dataWithRevenue.length)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-muted/20 p-3">
          <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-lg font-bold text-gray-900 dark:text-foreground">
            {formatCurrency(dataWithRevenue.reduce((sum, m) => sum + m.revenue, 0))}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-muted/20 p-3">
          <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Total Sales</p>
          <p className="text-lg font-bold text-gray-900 dark:text-foreground">
            {dataWithRevenue.reduce((sum, m) => sum + m.sales, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}
