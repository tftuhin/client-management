import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function PortalProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId: string | undefined = user.user_metadata?.client_id
  if (!clientId) redirect('/portal')

  const [
    { data: client },
    { data: requirements },
    { data: invoices },
    { data: agreements },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('company_name, contact_name, contact_email, contact_phone, website_url, industry, pipeline_stage, notes, assigned_to')
      .eq('id', clientId)
      .single(),
    supabase
      .from('project_requirements')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .single(),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, amount_paid, status, issue_date, due_date')
      .eq('client_id', clientId)
      .order('issue_date', { ascending: false }),
    supabase
      .from('agreements')
      .select('id, title, status, sent_at, signed_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Project</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{client?.company_name}</p>
      </div>

      {/* Project stage */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <StatusBadge type="pipeline" value={client?.pipeline_stage ?? 'lead'} />
            <span className="text-sm text-muted-foreground capitalize">
              {client?.pipeline_stage?.replace(/_/g, ' ')}
            </span>
          </div>
          {client?.notes && (
            <p className="mt-3 text-sm text-muted-foreground">{client.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Project requirements */}
      {requirements && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold">Project Brief — {requirements.project_name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            {requirements.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p>{requirements.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {requirements.budget_min != null && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Budget</p>
                  <p>{formatCurrency(requirements.budget_min)}{requirements.budget_max ? ` – ${formatCurrency(requirements.budget_max)}` : '+'}</p>
                </div>
              )}
              {requirements.timeline_weeks != null && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                  <p>{requirements.timeline_weeks} weeks</p>
                </div>
              )}
              {requirements.deadline && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                  <p>{formatDate(requirements.deadline)}</p>
                </div>
              )}
              {requirements.project_type && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="capitalize">{requirements.project_type.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>
            {requirements.priority_features?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {requirements.priority_features.map((f: string) => (
                    <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-xs">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Invoice</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="py-2.5 text-left text-xs font-medium text-muted-foreground">Due</th>
                  <th className="py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="py-2.5 text-right text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2.5 text-xs font-medium">{inv.invoice_number}<br/><span className="font-normal text-muted-foreground">{inv.title}</span></td>
                    <td className="py-2.5 text-xs text-muted-foreground">{formatDate(inv.issue_date)}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{formatDate(inv.due_date)}</td>
                    <td className="py-2.5 text-right text-xs font-semibold">{formatCurrency(inv.total)}</td>
                    <td className="py-2.5 text-right"><StatusBadge type="invoice" value={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Agreements */}
      {agreements && agreements.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold">Agreements</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y">
              {agreements.map(ag => (
                <li key={ag.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/portal/agreements/${ag.id}`} className="text-sm font-medium truncate hover:text-primary">
                      {ag.title}
                    </Link>
                    {ag.sent_at && (
                      <p className="text-xs text-muted-foreground">Sent {formatDate(ag.sent_at)}</p>
                    )}
                  </div>
                  <StatusBadge type="agreement" value={ag.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
