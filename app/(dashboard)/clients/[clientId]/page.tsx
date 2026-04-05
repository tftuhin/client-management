import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import { ArrowLeft, Globe, Mail, Phone, MapPin, FileText, Receipt, MessageSquare, Lightbulb } from 'lucide-react'
import { ClientEditSheet } from '@/components/clients/client-edit-sheet'
import { MessageComposer } from '@/components/clients/message-composer'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const [
    { data: client },
    { data: agreements },
    { data: invoices },
    { data: messages },
    { data: offers },
    { data: requirements },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*, staff:assigned_to(full_name)')
      .eq('id', clientId)
      .single(),
    supabase
      .from('agreements')
      .select('id, title, status, created_at, sent_at, signed_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, total, due_date, issue_date')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('id, content, message_type, is_pinned, created_at, staff:author_id(full_name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('next_offers')
      .select('id, title, service_type, status, estimated_value, follow_up_date, proposed_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_requirements')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  const totalInvoiced = (invoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const totalPaid = 0 // would need payments join

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/clients" className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex flex-1 items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{getInitials(client.company_name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{client.company_name}</h1>
              <p className="text-sm text-muted-foreground">{client.contact_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge type="pipeline" value={client.pipeline_stage} />
            <ClientEditSheet client={client}>
              <Button variant="outline" size="sm">Edit</Button>
            </ClientEditSheet>
          </div>
        </div>
      </div>

      {/* Contact info strip */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <a href={`mailto:${client.contact_email}`} className="flex items-center gap-1.5 hover:text-foreground">
          <Mail className="size-3.5" />
          {client.contact_email}
        </a>
        {client.contact_phone && (
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {client.contact_phone}
          </span>
        )}
        {client.website_url && (
          <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
            <Globe className="size-3.5" />
            {client.website_url.replace(/^https?:\/\//, '')}
          </a>
        )}
        {client.country && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {client.country}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Total invoiced</p>
            <p className="text-lg font-semibold">{formatCurrency(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Agreements</p>
            <p className="text-lg font-semibold">{agreements?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Added</p>
            <p className="text-lg font-semibold">{formatDate(client.created_at)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agreements">
            Agreements {agreements && agreements.length > 0 && `(${agreements.length})`}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices {invoices && invoices.length > 0 && `(${invoices.length})`}
          </TabsTrigger>
          <TabsTrigger value="messages">
            Notes {messages && messages.length > 0 && `(${messages.length})`}
          </TabsTrigger>
          <TabsTrigger value="offers">
            Offers {offers && offers.length > 0 && `(${offers.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-4 mt-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Client details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Industry', client.industry],
                    ['Company size', client.company_size],
                    ['Annual revenue', client.annual_revenue],
                    ['Lead source', client.lead_source],
                    ['Assigned to', (client.staff as any)?.full_name],
                    ['Address', client.address],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex gap-2">
                      <dt className="text-muted-foreground w-28 shrink-0">{label}</dt>
                      <dd>{val}</dd>
                    </div>
                  ) : null)}
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-28 shrink-0">Tags</dt>
                      <dd className="flex flex-wrap gap-1">
                        {client.tags.map(tag => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">{tag}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {client.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </CardContent>
              </Card>
            )}

            {requirements && requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Project requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  {requirements.filter(r => r.is_current).map(req => (
                    <div key={req.id} className="text-sm space-y-2">
                      <p className="font-medium">{req.project_name}</p>
                      {req.description && <p className="text-muted-foreground">{req.description}</p>}
                      {(req.budget_min || req.budget_max) && (
                        <p className="text-xs text-muted-foreground">
                          Budget: {req.budget_min ? formatCurrency(req.budget_min) : '?'}
                          {' — '}
                          {req.budget_max ? formatCurrency(req.budget_max) : '?'}
                        </p>
                      )}
                      {req.timeline_weeks && (
                        <p className="text-xs text-muted-foreground">Timeline: {req.timeline_weeks} weeks</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Agreements */}
        <TabsContent value="agreements">
          <div className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Link href={`/agreements/new?client=${clientId}`}>
                <Button size="sm">
                  <FileText className="size-4" />
                  New agreement
                </Button>
              </Link>
            </div>
            {agreements && agreements.length > 0 ? (
              <div className="rounded-xl ring-1 ring-foreground/10 divide-y overflow-hidden">
                {agreements.map(ag => (
                  <Link
                    key={ag.id}
                    href={`/agreements/${ag.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{ag.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(ag.created_at)}
                        {ag.sent_at && ` · Sent ${formatDate(ag.sent_at)}`}
                        {ag.signed_at && ` · Signed ${formatDate(ag.signed_at)}`}
                      </p>
                    </div>
                    <StatusBadge type="agreement" value={ag.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="size-5" />}
                title="No agreements yet"
                description="Create an agreement for this client."
              />
            )}
          </div>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <div className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Link href={`/invoices/new?client=${clientId}`}>
                <Button size="sm">
                  <Receipt className="size-4" />
                  New invoice
                </Button>
              </Link>
            </div>
            {invoices && invoices.length > 0 ? (
              <div className="rounded-xl ring-1 ring-foreground/10 divide-y overflow-hidden">
                {invoices.map(inv => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number} — {inv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatDate(inv.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                      <StatusBadge type="invoice" value={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Receipt className="size-5" />}
                title="No invoices yet"
                description="Create an invoice for this client."
              />
            )}
          </div>
        </TabsContent>

        {/* Messages / Notes */}
        <TabsContent value="messages">
          <div className="mt-4 space-y-4">
            <MessageComposer clientId={clientId} />
            {messages && messages.length > 0 ? (
              <div className="space-y-2">
                {messages.map(msg => (
                  <div key={msg.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-xs text-muted-foreground">
                        {msg.message_type === 'internal_note' ? '🔒 Internal note' : '📤 Client message'}
                        {' · '}
                        {(msg.staff as any)?.full_name ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MessageSquare className="size-5" />}
                title="No notes yet"
                description="Add an internal note or client message."
              />
            )}
          </div>
        </TabsContent>

        {/* Offers */}
        <TabsContent value="offers">
          <div className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Link href={`/clients/${clientId}/offers/new`}>
                <Button size="sm">
                  <Lightbulb className="size-4" />
                  New offer
                </Button>
              </Link>
            </div>
            {offers && offers.length > 0 ? (
              <div className="rounded-xl ring-1 ring-foreground/10 divide-y overflow-hidden">
                {offers.map(offer => (
                  <div key={offer.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{offer.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.service_type}
                        {offer.estimated_value && ` · ${formatCurrency(offer.estimated_value)}`}
                        {offer.follow_up_date && ` · Follow up ${formatDate(offer.follow_up_date)}`}
                      </p>
                    </div>
                    <StatusBadge type="offer" value={offer.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Lightbulb className="size-5" />}
                title="No offers yet"
                description="Track next service offers for this client."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
