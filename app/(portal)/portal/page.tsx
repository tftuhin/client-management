import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FolderOpen, FileText, Receipt, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId: string | undefined = user.user_metadata?.client_id
  if (!clientId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Your account is not linked to a client record. Please contact your project manager.</p>
      </div>
    )
  }

  const [{ data: client }, { data: invoices }, { data: agreements }, { data: messages }] = await Promise.all([
    supabase
      .from('clients')
      .select('company_name, contact_name, pipeline_stage, industry')
      .eq('id', clientId)
      .single(),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, status, due_date')
      .eq('client_id', clientId)
      .order('due_date', { ascending: false })
      .limit(5),
    supabase
      .from('agreements')
      .select('id, title, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('messages')
      .select('id, content, message_type, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const totalBilled = (invoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const unpaidInvoices = (invoices ?? []).filter(i => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{client?.company_name ?? 'Welcome'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Client Portal Overview</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Project Stage', value: client?.pipeline_stage?.replace(/_/g, ' ') ?? '—', icon: FolderOpen, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Total Billed', value: formatCurrency(totalBilled), icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Outstanding', value: formatCurrency(unpaidInvoices.reduce((s, i) => s + i.total, 0)), icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Agreements', value: (agreements ?? []).length, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold mt-0.5 capitalize">{s.value}</p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`size-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Invoices</CardTitle>
              <Link href="/portal/project" className="text-xs text-primary hover:underline">View project</Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {invoices && invoices.length > 0 ? (
              <ul className="divide-y">
                {invoices.map(inv => (
                  <li key={inv.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
                      <StatusBadge type="invoice" value={inv.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No invoices yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent messages */}
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Messages</CardTitle>
              <Link href="/portal/messages" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {messages && messages.length > 0 ? (
              <ul className="divide-y">
                {messages.map(msg => (
                  <li key={msg.id} className="py-2.5">
                    <p className="text-sm text-foreground line-clamp-2">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {msg.message_type === 'client_message' ? 'You' : 'Your PM'} · {formatDate(msg.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <Link href="/portal/messages" className="mt-2 inline-block text-xs text-primary hover:underline">
                  Send a message
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
