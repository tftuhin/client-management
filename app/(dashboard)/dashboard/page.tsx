import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; show_due?: string }>
}) {
  const params = await searchParams
  const showDue = params.show_due === '1'
  // 'all' | 'one_time' | 'recurring'
  const paymentType = params.type ?? 'all'

  const supabase = await createClient()
  const now = new Date()
  const currentYear = now.getFullYear()
  const prevYear = currentYear - 1

  // Fetch all paid invoices for current and previous year
  const [
    { data: paidThisYear },
    { data: paidLastYear },
    { data: dueInvoices },
    { data: allSales },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, total, paid_at, notes, payment_terms, clients(company_name)')
      .eq('status', 'paid')
      .gte('paid_at', `${currentYear}-01-01`)
      .lte('paid_at', `${currentYear}-12-31`),
    supabase
      .from('invoices')
      .select('id, total, paid_at, notes, payment_terms')
      .eq('status', 'paid')
      .gte('paid_at', `${prevYear}-01-01`)
      .lte('paid_at', `${prevYear}-12-31`),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, amount_paid, due_date, status, client_id, clients(company_name)')
      .in('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, status, issue_date, payment_terms, client_id, clients(company_name)')
      .in('status', ['paid', 'partially_paid', 'sent', 'viewed', 'overdue'])
      .order('issue_date', { ascending: false })
      .limit(30),
  ])

  // Classify invoices as recurring (subscription/retainer keywords) or one-time
  function isRecurring(inv: { payment_terms?: string | null; notes?: string | null }) {
    const text = `${inv.payment_terms ?? ''} ${inv.notes ?? ''}`.toLowerCase()
    return /retainer|recurring|monthly|subscription|annual/.test(text)
  }

  // Filter by payment type selection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function filterByType(items: any[]): any[] {
    if (paymentType === 'recurring') return items.filter(isRecurring)
    if (paymentType === 'one_time') return items.filter(i => !isRecurring(i))
    return items
  }

  const filteredThisYear = filterByType(paidThisYear ?? [])
  const filteredLastYear = filterByType(paidLastYear ?? [])
  const filteredAllSales = filterByType(allSales ?? [])

  const totalRevenue = filteredThisYear.reduce((s, i) => s + (i.total ?? 0), 0)
  const lastYearRevenue = filteredLastYear.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalDue = (dueInvoices ?? []).reduce((s, i) => s + ((i.total ?? 0) - (i.amount_paid ?? 0)), 0)
  const totalSales = filteredThisYear.length
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  const yoyChange = lastYearRevenue > 0
    ? ((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100
    : null

  // Monthly breakdown
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthly = months.map((label, idx) => {
    const m = String(idx + 1).padStart(2, '0')
    const current = filteredThisYear
      .filter(i => i.paid_at?.startsWith(`${currentYear}-${m}`))
      .reduce((s, i) => s + (i.total ?? 0), 0)
    const previous = filteredLastYear
      .filter(i => i.paid_at?.startsWith(`${prevYear}-${m}`))
      .reduce((s, i) => s + (i.total ?? 0), 0)
    const mom = previous > 0 ? ((current - previous) / previous) * 100 : null
    return { label, current, previous, mom }
  })
  const maxBar = Math.max(...monthly.flatMap(m => [m.current, m.previous]), 1)

  // Month-over-month for the current month vs previous month
  const currentMonthIdx = now.getMonth()
  const prevMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1
  const momChange = monthly[prevMonthIdx].current > 0
    ? ((monthly[currentMonthIdx].current - monthly[prevMonthIdx].current) / monthly[prevMonthIdx].current) * 100
    : null

  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      sub: `${currentYear} YTD`,
      icon: DollarSign,
      trend: yoyChange,
      trendLabel: `vs ${prevYear}`,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(totalDue),
      sub: `${dueInvoices?.length ?? 0} invoices due`,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Sales',
      value: totalSales,
      sub: `paid invoices ${currentYear}`,
      icon: BarChart3,
      trend: momChange,
      trendLabel: 'vs last month',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Avg. Invoice',
      value: formatCurrency(avgSale),
      sub: `${currentYear} average`,
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            + New Invoice
          </Link>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            + Add Client
          </Link>
        </div>
      </div>

      {/* Filters: payment type + due toggle */}
      <DashboardFilters
        paymentType={paymentType}
        showDue={showDue}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.title}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold leading-tight mt-0.5">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
              </div>
              {stat.trend != null && (
                <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${stat.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {stat.trend >= 0
                    ? <ArrowUpRight className="size-3.5" />
                    : <ArrowDownRight className="size-3.5" />}
                  {Math.abs(stat.trend).toFixed(1)}% {stat.trendLabel}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Breakdown + YoY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Monthly Revenue</CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm bg-primary/80" />
                  {currentYear}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm bg-muted-foreground/30" />
                  {prevYear}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-end gap-1 h-36">
              {monthly.map(({ label, current, previous, mom }) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-0.5 group">
                  {/* MoM badge on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    {mom != null && (
                      <span className={`text-xs font-medium ${mom >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {mom >= 0 ? '+' : ''}{mom.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {/* Bars */}
                  <div className="flex w-full items-end gap-0.5">
                    <div
                      className="flex-1 rounded-t bg-primary/80 hover:bg-primary transition-colors min-h-[2px]"
                      style={{ height: `${Math.max((current / maxBar) * 88, current > 0 ? 4 : 2)}px` }}
                      title={`${currentYear} ${label}: ${formatCurrency(current)}`}
                    />
                    <div
                      className="flex-1 rounded-t bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors min-h-[2px]"
                      style={{ height: `${Math.max((previous / maxBar) * 88, previous > 0 ? 4 : 2)}px` }}
                      title={`${prevYear} ${label}: ${formatCurrency(previous)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* YoY */}
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold">Year-over-Year</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{currentYear}</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min((totalRevenue / Math.max(totalRevenue, lastYearRevenue, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{prevYear}</p>
              <p className="text-xl font-bold">{formatCurrency(lastYearRevenue)}</p>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-muted-foreground/40"
                  style={{ width: `${Math.min((lastYearRevenue / Math.max(totalRevenue, lastYearRevenue, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
            {yoyChange != null && (
              <div className={`flex items-center gap-1.5 text-sm font-medium pt-1 ${yoyChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {yoyChange >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}% YoY growth
              </div>
            )}
            {momChange != null && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${momChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {momChange >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}% vs last month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Due Invoices (conditional) */}
      {showDue && dueInvoices && dueInvoices.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-4 text-amber-500" />
                Due Invoices
              </CardTitle>
              <Link href="/invoices" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Invoice</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Client</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Due</th>
                  <th className="py-2.5 text-right text-xs font-medium text-muted-foreground">Balance</th>
                  <th className="py-2.5 text-right text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dueInvoices.map(inv => {
                  const remaining = (inv.total ?? 0) - (inv.amount_paid ?? 0)
                  const isOverdue = inv.status === 'overdue' || new Date(inv.due_date) < now
                  return (
                    <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5">
                        <Link href={`/invoices/${inv.id}`} className="font-medium hover:text-primary text-xs">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {(inv.clients as any)?.company_name ?? '—'}
                      </td>
                      <td className={`py-2.5 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-2.5 text-right text-xs font-semibold">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="py-2.5 text-right">
                        <StatusBadge type="invoice" value={inv.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* All Sales */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Sales</CardTitle>
            <Link href="/invoices" className="text-xs text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredAllSales.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Invoice</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Client</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="py-2.5 text-right text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAllSales.slice(0, 20).map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5">
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:text-primary text-xs">
                        {inv.invoice_number}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{inv.title}</p>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {(inv.clients as any)?.company_name ?? '—'}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="py-2.5 text-xs">
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                        isRecurring(inv)
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isRecurring(inv) ? 'Recurring' : 'One-time'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs font-semibold">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-2.5 text-right">
                      <StatusBadge type="invoice" value={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No invoices match the selected filter</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
