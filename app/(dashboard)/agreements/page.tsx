import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate } from '@/lib/utils'
import { Plus, FileText } from 'lucide-react'

export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('agreements')
    .select('id, title, status, created_at, sent_at, signed_at, client_id, clients(company_name)')
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.q) {
    query = query.ilike('title', `%${params.q}%`)
  }

  const { data: agreements } = await query

  const statuses = ['draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled']

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agreements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {agreements?.length ?? 0} agreements
          </p>
        </div>
        <Link href="/agreements/new">
          <Button>
            <Plus className="size-4" />
            New agreement
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <Link
          href="/agreements"
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            !params.status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </Link>
        {statuses.map(s => (
          <Link
            key={s}
            href={`/agreements?status=${s}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              params.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {agreements && agreements.length > 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map(ag => (
                <TableRow key={ag.id}>
                  <TableCell>
                    <Link href={`/agreements/${ag.id}`} className="font-medium hover:text-primary">
                      {ag.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <Link href={`/clients/${ag.client_id}`} className="hover:text-foreground">
                      {(ag.clients as any)?.company_name ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="agreement" value={ag.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(ag.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {ag.sent_at ? formatDate(ag.sent_at) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {ag.signed_at ? formatDate(ag.signed_at) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No agreements yet"
          description="Create your first client agreement."
          action={
            <Link href="/agreements/new">
              <Button>
                <Plus className="size-4" />
                New agreement
              </Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
