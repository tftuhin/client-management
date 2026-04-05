import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { INVOICE_SOURCES } from '@/lib/constants'
import { AllSalesTable } from '@/components/dashboard/all-sales-table'
import { QuickSaleButtons } from '@/components/dashboard/quick-sale-buttons'

const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SOURCE_KEYS = ['upwork', 'paddle', 'direct', 'other']

function pct(a: number, b: number) {
  if (b === 0) return null
  return ((a - b) / b) * 100
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRow } = user
    ? await supabase.from('staff').select('full_name, email').eq('id', user.id).single()
    : { data: null }

  const now = new Date()
  const currentYear = now.getFullYear()
  const prevYear = currentYear - 1

  const in7Days = new Date(now)
  in7Days.setDate(now.getDate() + 7)
  const todayStr = now.toISOString().split('T')[0]
  const in7DaysStr = in7Days.toISOString().split('T')[0]

  const [
    { data: invoicesThisYear },
    { data: invoicesLastYear },
    { data: dueInvoices },
    { data: allSales },
    { data: upcomingOffers },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, total, paid_at, status, source, invoice_type, client_id, clients(company_name), title')
      .eq('status', 'paid')
      .gte('paid_at', `${currentYear}-01-01`)
      .lte('paid_at', `${currentYear}-12-31`),
    supabase
      .from('invoices')
      .select('id, total, paid_at, status, source, invoice_type')
      .eq('status', 'paid')
      .gte('paid_at', `${prevYear}-01-01`)
      .lte('paid_at', `${prevYear}-12-31`),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, amount_paid, due_date, issue_date, status, source, invoice_type, client_id, clients(company_name)')
      .in('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(20),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, status, issue_date, source, invoice_type, client_id, clients(company_name)')
      .not('status', 'in', '("draft","cancelled")')
      .order('issue_date', { ascending: false })
      .limit(50),
    supabase
      .from('next_offers')
      .select('id, title, service_type, estimated_value, follow_up_date, status, client_id, clients(company_name)')
      .in('status', ['draft', 'proposed'])
      .gte('follow_up_date', todayStr)
      .lte('follow_up_date', in7DaysStr)
      .order('follow_up_date', { ascending: true }),
  ])

  const paid = invoicesThisYear ?? []
  const paidLast = invoicesLastYear ?? []
  const due = dueInvoices ?? []

  const totalRevenue = paid.reduce((s, i) => s + (i.total ?? 0), 0)
  const lastRevenue = paidLast.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalDue = due.reduce((s, i) => s + ((i.total ?? 0) - (i.amount_paid ?? 0)), 0)
  const totalSales = paid.length
  const lastSales = paidLast.length
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  // Monthly breakdown
  const monthly = MONTH_LABELS.map((label, idx) => {
    const m = String(idx + 1).padStart(2, '0')
    const rows = paid.filter(i => i.paid_at?.startsWith(`${currentYear}-${m}`))
    const bySource: Record<string, number> = {}
    for (const src of SOURCE_KEYS) {
      bySource[src] = rows.filter(i => i.source === src).reduce((s, i) => s + (i.total ?? 0), 0)
    }
    const total = rows.reduce((s, i) => s + (i.total ?? 0), 0)
    const sales = rows.length
    return { label, bySource, total, sales }
  })

  // MoM: compare each month to the previous month
  const monthlyWithMom = monthly.map((m, idx) => {
    const prev = idx === 0 ? null : monthly[idx - 1].total
    return { ...m, mom: pct(m.total, prev ?? 0) }
  })

  const sourceTotals: Record<string, number> = {}
  for (const src of SOURCE_KEYS) {
    sourceTotals[src] = paid.filter(i => i.source === src).reduce((s, i) => s + (i.total ?? 0), 0)
  }
  const grandTotal = paid.reduce((s, i) => s + (i.total ?? 0), 0)
  const grandSales = paid.length

  // YoY: revenue + count
  const yoyRev = pct(totalRevenue, lastRevenue)
  const yoySales = pct(totalSales, lastSales)

  const displayName = staffRow?.full_name ?? user?.email ?? ''
  const displayEmail = staffRow?.email ?? user?.email ?? ''
  const initials = displayName.charAt(0).toUpperCase()

  // Get active source columns (any that have data this year or last)
  const activeSources = INVOICE_SOURCES.filter(s =>
    s.value !== 'other' || paid.some(i => i.source === 'other') || due.some(i => i.source === 'other')
  )

  return (
    <div className="min-h-full bg-white dark:bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-border">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-lg bg-gray-900 dark:bg-foreground px-3 py-1.5 text-sm font-semibold text-white dark:text-background">
            Zeon Studio
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 dark:bg-muted text-sm font-semibold text-gray-700 dark:text-foreground">
            {initials}
          </div>
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-gray-900 dark:text-foreground">{displayName}</p>
            <p className="text-xs text-gray-500 dark:text-muted-foreground">{displayEmail}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-7">
        {/* ── Stat cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5">
            <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">completed only</p>
          </div>
          {/* Total Due */}
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20 p-5">
            <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Total Due</p>
            <p className="text-3xl font-bold text-amber-500">{formatCurrency(totalDue)}</p>
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">{due.length} invoices</p>
          </div>
          {/* Total Sales */}
          <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5">
            <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-foreground">{totalSales}</p>
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">completed</p>
          </div>
          {/* Avg Sale */}
          <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5">
            <p className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Avg Sale ({currentYear})</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-foreground">{formatCurrency(avgSale)}</p>
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">{totalSales} sales this year</p>
          </div>
        </div>

        {/* ── Quick add source buttons ─────────────────────────── */}
        <QuickSaleButtons sources={activeSources} />

        {/* ── Due Invoices ──────────────────────────────────────── */}
        {due.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-border">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Due Invoices</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                {due.length} · {formatCurrency(totalDue)}
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-border">
                  {['Month', 'Client', 'Project', 'Source', 'Amount', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-border">
                {due.map(inv => {
                  const src = INVOICE_SOURCES.find(s => s.value === inv.source)
                  const d = new Date(inv.issue_date)
                  const monthLabel = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/30">
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-muted-foreground">{monthLabel}</td>
                      <td className="px-5 py-3 text-sm text-gray-800 dark:text-foreground">{(inv.clients as any)?.company_name ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-muted-foreground">{inv.title}</td>
                      <td className="px-5 py-3">
                        {src ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${src.bg} ${src.color} ${src.border} border`}>
                            {src.label}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-amber-600">{formatCurrency(inv.total)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 text-xs">
                          <a href={`/invoices/${inv.id}`} className="text-gray-500 hover:text-gray-800 dark:hover:text-foreground">Edit</a>
                          <span className="text-red-400 hover:text-red-600 cursor-pointer">Delete</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Upcoming Offers (Next 7 days) ─────────────────────── */}
        {upcomingOffers && upcomingOffers.length > 0 && (
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-100 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Offer Pipeline — Next 7 Days</h2>
                <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                  {upcomingOffers.length} due
                </span>
              </div>
              <a href="/offers" className="text-xs text-violet-600 hover:text-violet-800 dark:text-violet-400">View all →</a>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-border">
                  {['Client', 'Offer', 'Service', 'Value', 'Follow-up'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-border">
                {upcomingOffers.map(offer => (
                  <tr key={offer.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/30">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-foreground">
                      <a href={`/clients/${offer.client_id}`} className="hover:text-primary">
                        {(offer.clients as any)?.company_name ?? '—'}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 dark:text-foreground">{offer.title}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-muted-foreground">{offer.service_type ?? '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-foreground">
                      {offer.estimated_value ? formatCurrency(offer.estimated_value) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-violet-600 dark:text-violet-400">
                      {offer.follow_up_date ? new Date(offer.follow_up_date).toLocaleDateString('default', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Year over Year ────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 dark:border-border p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground mb-4">Year over Year</h2>
          <div className="grid grid-cols-2 gap-8">
            {/* Revenue */}
            <div>
              <p className="text-xs text-gray-400 dark:text-muted-foreground mb-1">Revenue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-foreground">{formatCurrency(totalRevenue)}</span>
                <span className="text-sm text-gray-500">{currentYear}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <span>{formatCurrency(lastRevenue)} in {prevYear}</span>
                <PctBadge v={yoyRev} />
              </div>
            </div>
            {/* Sales Count */}
            <div>
              <p className="text-xs text-gray-400 dark:text-muted-foreground mb-1">Sales Count</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-foreground">{totalSales}</span>
                <span className="text-sm text-gray-500">{currentYear}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <span>{lastSales} in {prevYear}</span>
                <PctBadge v={yoySales} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Monthly Breakdown ─────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 dark:border-border overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-border">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Monthly Breakdown</h2>
            <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-border bg-white dark:bg-card px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-muted-foreground">
              {currentYear}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-border">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">Month</th>
                  {activeSources.map(src => (
                    <th key={src.value} className={`px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${src.color}`}>
                      {src.label}
                    </th>
                  ))}
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">Total</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">Sales</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-muted-foreground uppercase tracking-wide">MoM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-border">
                {monthlyWithMom.map(({ label, bySource, total, sales, mom }) => (
                  <tr key={label} className={`hover:bg-gray-50/50 dark:hover:bg-muted/20 ${total > 0 ? 'font-medium' : ''}`}>
                    <td className={`px-5 py-3 text-sm ${total > 0 ? 'text-gray-900 dark:text-foreground' : 'text-gray-400 dark:text-muted-foreground'}`}>{label}</td>
                    {activeSources.map(src => (
                      <td key={src.value} className={`px-5 py-3 text-sm ${bySource[src.value] > 0 ? src.color : 'text-gray-300 dark:text-muted-foreground/30'}`}>
                        {bySource[src.value] > 0 ? formatCurrency(bySource[src.value]) : '—'}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">{total > 0 ? formatCurrency(total) : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{sales > 0 ? sales : '—'}</td>
                    <td className="px-5 py-3 text-sm">{total > 0 ? <PctBadge v={mom} /> : <span className="text-gray-300 dark:text-muted-foreground/30">—</span>}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-200 dark:border-border bg-gray-50/60 dark:bg-muted/20 font-semibold">
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">Total {currentYear}</td>
                  {activeSources.map(src => (
                    <td key={src.value} className={`px-5 py-3 text-sm ${src.color}`}>
                      {formatCurrency(sourceTotals[src.value] ?? 0)}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">{formatCurrency(grandTotal)}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-foreground">{grandSales}</td>
                  <td className="px-5 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── All Sales (client component for tabs) ─────────────── */}
        <AllSalesTable sales={allSales ?? []} sources={INVOICE_SOURCES} />
      </div>
    </div>
  )
}
