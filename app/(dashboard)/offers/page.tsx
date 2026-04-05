import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Lightbulb } from 'lucide-react'
import { OfferActions } from '@/components/offers/offer-actions'
import type { StaffRole } from '@/types/database'
import { clientScope } from '@/lib/permissions'

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRow } = user
    ? await supabase.from('staff').select('role').eq('id', user.id).single()
    : { data: null }
  const role = (staffRow?.role ?? 'admin') as StaffRole

  let query = supabase
    .from('next_offers')
    .select('id, title, service_type, status, estimated_value, follow_up_date, created_at, client_id, clients(id, company_name, assigned_to)')
    .order('follow_up_date', { ascending: true, nullsFirst: false })

  // PMs only see offers for their assigned clients
  const scope = clientScope(role, user?.id ?? '')
  if (scope) {
    const { data: assignedClients } = await supabase
      .from('clients')
      .select('id')
      .eq('assigned_to', user!.id)
    const ids = (assignedClients ?? []).map(c => c.id)
    if (ids.length > 0) {
      query = query.in('client_id', ids)
    } else {
      return renderEmpty()
    }
  }

  if (params.status) query = query.eq('status', params.status)

  const { data: offers } = await query

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  const statuses = ['draft', 'proposed', 'accepted', 'declined']

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Offer Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{offers?.length ?? 0} offers</p>
        </div>
        <Link href="/offers/new">
          <Button>
            <Plus className="size-4" />
            New offer
          </Button>
        </Link>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Link href="/offers" className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${!params.status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>All</Link>
        {statuses.map(s => (
          <Link key={s} href={`/offers?status=${s}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${params.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {s}
          </Link>
        ))}
      </div>

      {offers && offers.length > 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map(o => {
                const followUp = o.follow_up_date ? new Date(o.follow_up_date) : null
                const isDue = followUp && followUp <= in7Days && o.status === 'draft'
                return (
                  <TableRow key={o.id} className={isDue ? 'bg-amber-50/40 dark:bg-amber-950/20' : undefined}>
                    <TableCell>
                      <p className="text-sm font-medium">{o.title}</p>
                      {isDue && (
                        <p className="text-xs text-amber-600 font-medium">Due soon</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      <Link href={`/clients/${o.client_id}`} className="hover:text-foreground">
                        {(o.clients as any)?.company_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{o.service_type ?? '—'}</TableCell>
                    <TableCell className="text-sm">{o.estimated_value ? formatCurrency(o.estimated_value) : '—'}</TableCell>
                    <TableCell className={`text-xs ${isDue ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                      {o.follow_up_date ? formatDate(o.follow_up_date) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="offer" value={o.status} />
                    </TableCell>
                    <TableCell>
                      <OfferActions offerId={o.id} clientId={o.client_id} status={o.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Lightbulb className="size-5" />}
          title="No offers yet"
          description="Track upsell opportunities and follow-up dates."
          action={<Link href="/offers/new"><Button><Plus className="size-4" />New offer</Button></Link>}
        />
      )}
    </div>
  )
}

function renderEmpty() {
  return (
    <div className="p-6">
      <EmptyState icon={<Lightbulb className="size-5" />} title="No offers yet" description="No offers assigned to your clients." />
    </div>
  )
}
