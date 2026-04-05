import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Receipt } from 'lucide-react'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, title, status, total, amount_paid, currency, due_date, issue_date, client_id, clients(company_name)')
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.q) {
    query = query.or(`invoice_number.ilike.%${params.q}%,title.ilike.%${params.q}%`)
  }

  const { data: invoices } = await query

  const statuses = ['draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled']

  const totalOutstanding = (invoices ?? [])
    .filter(i => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status))
    .reduce((s, i) => s + ((i.total ?? 0) - (i.amount_paid ?? 0)), 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoices?.length ?? 0} invoices
            {totalOutstanding > 0 && ` · ${formatCurrency(totalOutstanding)} outstanding`}
          </p>
        </div>
        <Link href="/invoices/new">
          <Button>
            <Plus className="size-4" />
            New invoice
          </Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <Link
          href="/invoices"
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            !params.status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </Link>
        {statuses.map(s => (
          <Link
            key={s}
            href={`/invoices?status=${s}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              params.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {invoices && invoices.length > 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => {
                const balance = (inv.total ?? 0) - (inv.amount_paid ?? 0)
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:text-primary">
                        {inv.invoice_number}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{inv.title}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Link href={`/clients/${inv.client_id}`} className="hover:text-foreground">
                        {(inv.clients as any)?.company_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="invoice" value={inv.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(inv.issue_date)}
                    </TableCell>
                    <TableCell className={`text-xs ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {formatDate(inv.due_date)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(inv.total ?? 0, inv.currency)}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${balance > 0 && inv.status !== 'cancelled' ? 'text-amber-600' : ''}`}>
                      {inv.status === 'paid' ? (
                        <span className="text-green-600">Paid</span>
                      ) : (
                        formatCurrency(balance, inv.currency)
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Receipt className="size-5" />}
          title="No invoices yet"
          description="Create your first invoice."
          action={
            <Link href="/invoices/new">
              <Button>
                <Plus className="size-4" />
                New invoice
              </Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
