'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-border p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-muted-foreground">No data available</p>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const maxSales = Math.max(...data.map(d => d.sales), 1)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Revenue & Sales Growth</h2>
        <p className="text-xs text-gray-500 dark:text-muted-foreground">Monthly trends across the year</p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            label={{ value: 'Sales', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--color-emerald-600))"
            strokeWidth={2.5}
            dot={{ fill: 'hsl(var(--color-emerald-600))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue"
            isAnimationActive={true}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--color-blue-600))"
            strokeWidth={2.5}
            dot={{ fill: 'hsl(var(--color-blue-600))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Sales Count"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
