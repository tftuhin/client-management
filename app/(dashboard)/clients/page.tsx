import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { getInitials, formatDate } from '@/lib/utils'
import { Plus, Users } from 'lucide-react'
import { NewClientSheet } from '@/components/clients/new-client-sheet'
import { clientScope } from '@/lib/permissions'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; archived?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRow } = user
    ? await supabase.from('staff').select('role').eq('id', user.id).single()
    : { data: null }
  const role = staffRow?.role ?? 'member'
  const scope = clientScope(role, user?.id ?? '')

  let query = supabase
    .from('clients')
    .select('id, company_name, contact_name, contact_email, pipeline_stage, industry, assigned_to, created_at, is_archived, tags')
    .order('created_at', { ascending: false })

  if (scope) query = query.eq(scope.column, scope.value)

  if (params.archived === '1') {
    query = query.eq('is_archived', true)
  } else {
    query = query.eq('is_archived', false)
  }

  if (params.stage) {
    query = query.eq('pipeline_stage', params.stage)
  }

  if (params.q) {
    query = query.or(
      `company_name.ilike.%${params.q}%,contact_name.ilike.%${params.q}%,contact_email.ilike.%${params.q}%`
    )
  }

  const { data: clients } = await query

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients?.length ?? 0} {params.archived === '1' ? 'archived' : 'active'} clients
          </p>
        </div>
        <NewClientSheet>
          <Button>
            <Plus className="size-4" />
            Add client
          </Button>
        </NewClientSheet>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <SearchInput defaultValue={params.q} />
        <Link
          href={params.archived === '1' ? '/clients' : '/clients?archived=1'}
          className="inline-flex items-center rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          {params.archived === '1' ? 'Show active' : 'Show archived'}
        </Link>
      </div>

      {clients && clients.length > 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => (
                <TableRow key={client.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="flex items-center gap-2.5 hover:text-primary"
                    >
                      <Avatar size="sm">
                        <AvatarFallback>{getInitials(client.company_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{client.company_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {client.contact_email}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {client.industry ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="pipeline" value={client.pipeline_stage} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(client.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Users className="size-5" />}
          title={params.q ? 'No clients match your search' : 'No clients yet'}
          description={params.q ? 'Try a different search term.' : 'Add your first client to get started.'}
          action={
            !params.q && (
              <NewClientSheet>
                <Button>
                  <Plus className="size-4" />
                  Add client
                </Button>
              </NewClientSheet>
            )
          }
        />
      )}
    </div>
  )
}

function SearchInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/clients">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search clients…"
        className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </form>
  )
}
