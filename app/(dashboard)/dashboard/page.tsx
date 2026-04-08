import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { INVOICE_SOURCES } from '@/lib/constants'
import { AllSalesTable } from '@/components/dashboard/all-sales-table'
import { GrowthMatrix } from '@/components/dashboard/growth-matrix'
import { LeadJourney } from '@/components/dashboard/lead-journey'
import { MonthlyBreakdownTable } from '@/components/dashboard/monthly-breakdown-table'

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
    { data: allClients },
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
    supabase
      .from('clients')
      .select('id, company_name, pipeline_stage, created_at, updated_at')
      .eq('is_archived', false)
      .order('created_at', { ascending: true }),
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

  // Monthly breakdown - optimized to single pass O(n) instead of O(n*12*sources)
  const monthlyData: Map<string, { revenue: number; sales: number; bySource: Record<string, number> }> = paid.reduce(
    (acc, invoice) => {
      const paidDate = invoice.paid_at?.split('T')[0] ?? ''
      const month = paidDate.substring(0, 7) // YYYY-MM format
      const monthNum = parseInt(month.split('-')[1] ?? '0') - 1
      const src = invoice.source ?? 'direct'

      if (!acc.has(month)) {
        acc.set(month, { revenue: 0, sales: 0, bySource: { upwork: 0, paddle: 0, direct: 0, other: 0 } })
      }

      const monthInfo = acc.get(month)!
      monthInfo.revenue += invoice.total ?? 0
      monthInfo.sales += 1
      monthInfo.bySource[src] = (monthInfo.bySource[src] ?? 0) + (invoice.total ?? 0)

      return acc
    },
    new Map<string, { revenue: number; sales: number; bySource: Record<string, number> }>()
  )

  const monthly = MONTH_LABELS.map((label, idx) => {
    const m = String(idx + 1).padStart(2, '0')
    const monthKey = `${currentYear}-${m}`
    const monthInfo = monthlyData.get(monthKey)
    const bySource = monthInfo?.bySource ?? { upwork: 0, paddle: 0, direct: 0, other: 0 }
    const total = monthInfo?.revenue ?? 0
    const sales = monthInfo?.sales ?? 0
    return { label, bySource, total, sales }
  })

  // MoM: compare each month to the previous month
  const monthlyWithMom = monthly.map((m, idx) => {
    const prev = idx === 0 ? null : monthly[idx - 1].total
    return { ...m, mom: pct(m.total, prev ?? 0) }
  })

  const sourceTotals: Record<string, number> = paid.reduce(
    (acc, invoice) => {
      const src = invoice.source ?? 'direct'
      acc[src] = (acc[src] ?? 0) + (invoice.total ?? 0)
      return acc
    },
    { upwork: 0, paddle: 0, direct: 0, other: 0 } as Record<string, number>
  )
  const grandTotal = paid.reduce((s, i) => s + (i.total ?? 0), 0)
  const grandSales = paid.length

  // YoY: revenue + count
  const yoyRev = pct(totalRevenue, lastRevenue)
  const yoySales = pct(totalSales, lastSales)

  // ═════════════════════════════════════════════════════════════════
  // Growth Matrix Computations
  // ═════════════════════════════════════════════════════════════════
  const clients = allClients ?? []
  const thisMonthDate = new Date()
  const lastMonthDate = new Date(thisMonthDate.getFullYear(), thisMonthDate.getMonth() - 1, 1)
  const thisMonthStr = `${thisMonthDate.getFullYear()}-${String(thisMonthDate.getMonth() + 1).padStart(2, '0')}`
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const newLeadsThisMonth = clients.filter(c => c.created_at.startsWith(thisMonthStr)).length
  const newLeadsLastMonth = clients.filter(c => c.created_at.startsWith(lastMonthStr)).length

  const activeClients = clients.filter(c => c.pipeline_stage === 'active').length
  const completedClients = clients.filter(c => c.pipeline_stage === 'completed').length
  const churnedClients = clients.filter(c => c.pipeline_stage === 'churned').length
  const totalClients = clients.length

  const conversionRate = totalClients > 0 ? Math.round(((activeClients + completedClients) / totalClients) * 100) : 0
  const winRate =
    completedClients + churnedClients > 0
      ? Math.round((completedClients / (completedClients + churnedClients)) * 100)
      : null

  const churnRate =
    completedClients + churnedClients > 0
      ? Math.round((churnedClients / (completedClients + churnedClients)) * 100)
      : null

  const thisMonthRevenue = monthly[thisMonthDate.getMonth()]?.total ?? 0
  const lastMonthRevenue = monthly[lastMonthDate.getMonth()]?.total ?? 0
  const prevAvgSale = lastSales > 0 ? lastRevenue / lastSales : 0

  // Pipeline value from active offers
  const pipelineValue = (upcomingOffers ?? []).reduce((sum, offer) => sum + (offer.estimated_value ?? 0), 0)

  // Lead velocity (trend of new leads)
  const leadVelocity =
    newLeadsLastMonth > 0 ? Math.round(((newLeadsThisMonth - newLeadsLastMonth) / newLeadsLastMonth) * 100) : null

  // ═════════════════════════════════════════════════════════════════
  // Lead Journey Computations
  // ═════════════════════════════════════════════════════════════════
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
  const leadJourneyClients = clients.map(c => ({
    id: c.id,
    company_name: c.company_name,
    stage: c.pipeline_stage,
    isStuck: now.getTime() - new Date(c.updated_at).getTime() > TWO_WEEKS_MS,
    daysInStage: Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
  }))

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* ── Growth Matrix (merged with YoY) ────────────────────── */}
        <GrowthMatrix
          thisMonthRevenue={thisMonthRevenue}
          lastMonthRevenue={lastMonthRevenue}
          newLeadsThisMonth={newLeadsThisMonth}
          newLeadsLastMonth={newLeadsLastMonth}
          conversionRate={conversionRate}
          winRate={winRate}
          churnRate={churnRate}
          avgSale={avgSale}
          prevAvgSale={prevAvgSale}
          activeClients={activeClients}
          totalClients={totalClients}
          currentYear={currentYear}
          prevYear={prevYear}
          totalRevenue={totalRevenue}
          lastRevenue={lastRevenue}
          totalSales={totalSales}
          lastSales={lastSales}
          pipelineValue={pipelineValue}
          leadVelocity={leadVelocity}
        />

        {/* ── Lead Journey ──────────────────────────────────────── */}
        <LeadJourney leads={leadJourneyClients} />

        {/* ── Due Invoices ──────────────────────────────────────── */}
        {due.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-border">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Due Invoices</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                {due.length} · {formatCurrency(totalDue)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
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
          </div>
        )}

        {/* ── Monthly Breakdown (Expandable) ────────────────────── */}
        <MonthlyBreakdownTable
          monthlyData={monthlyWithMom}
          activeSources={activeSources}
          currentYear={currentYear}
        />

        {/* ── All Sales (client component for tabs) ─────────────── */}
        <AllSalesTable sales={allSales ?? []} sources={INVOICE_SOURCES} />
      </div>
    </div>
  )
}
