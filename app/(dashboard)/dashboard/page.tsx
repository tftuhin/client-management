import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils'
import {
  Users,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalClients },
    { data: activeClients },
    { data: pendingInvoices },
    { data: overdueInvoices },
    { data: recentActivity },
    { data: upcomingFollowUps },
    { data: recentAgreements },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('clients').select('id').eq('pipeline_stage', 'active').eq('is_archived', false),
    supabase
      .from('invoices')
      .select('id, invoice_number, total, client_id, due_date, clients(company_name)')
      .in('status', ['sent', 'viewed', 'partially_paid'])
      .order('due_date'),
    supabase
      .from('invoices')
      .select('id, invoice_number, total, client_id, due_date, clients(company_name)')
      .eq('status', 'overdue')
      .order('due_date'),
    supabase
      .from('activity_log')
      .select('id, event_type, description, created_at, staff(full_name)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('next_offers')
      .select('id, title, follow_up_date, client_id, clients(company_name)')
      .eq('status', 'proposed')
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('follow_up_date'),
    supabase
      .from('agreements')
      .select('id, title, status, client_id, created_at, clients(company_name)')
      .in('status', ['sent', 'viewed'])
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const pendingRevenue = (pendingInvoices ?? []).reduce((sum, inv) => sum + (inv.total ?? 0), 0)
  const overdueRevenue = (overdueInvoices ?? []).reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  const stats = [
    {
      title: 'Total Clients',
      value: totalClients ?? 0,
      sub: `${activeClients?.length ?? 0} active`,
      icon: Users,
      href: '/clients',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Pending Invoices',
      value: formatCurrency(pendingRevenue),
      sub: `${pendingInvoices?.length ?? 0} outstanding`,
      icon: Receipt,
      href: '/invoices',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Overdue',
      value: formatCurrency(overdueRevenue),
      sub: `${overdueInvoices?.length ?? 0} overdue invoices`,
      icon: AlertCircle,
      href: '/invoices',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Follow-ups Due',
      value: upcomingFollowUps?.length ?? 0,
      sub: 'this week',
      icon: Clock,
      href: '/clients',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(stat => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:ring-primary/20 transition-shadow cursor-pointer">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`size-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-lg font-semibold leading-tight truncate">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {recentActivity && recentActivity.length > 0 ? (
              <ul className="divide-y">
                {recentActivity.map(item => (
                  <li key={item.id} className="py-2.5 flex items-start gap-2">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                      <TrendingUp className="size-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Agreements + Overdue invoices */}
        <div className="flex flex-col gap-4">
          {/* Agreements awaiting signature */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Awaiting Signature</CardTitle>
                <Link href="/agreements" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {recentAgreements && recentAgreements.length > 0 ? (
                <ul className="divide-y">
                  {recentAgreements.map(ag => (
                    <li key={ag.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ag.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(ag.clients as any)?.company_name ?? ''}
                        </p>
                      </div>
                      <StatusBadge type="agreement" value={ag.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No pending agreements</p>
              )}
            </CardContent>
          </Card>

          {/* Overdue invoices */}
          {overdueInvoices && overdueInvoices.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="size-4" />
                    Overdue Invoices
                  </CardTitle>
                  <Link href="/invoices" className="text-xs text-primary hover:underline">
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <ul className="divide-y">
                  {overdueInvoices.slice(0, 4).map(inv => (
                    <li key={inv.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(inv.due_date)}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-red-600 shrink-0">
                        {formatCurrency(inv.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
