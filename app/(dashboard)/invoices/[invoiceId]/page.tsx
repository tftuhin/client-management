import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ArrowLeft, Download } from 'lucide-react'
import { InvoiceActions } from '@/components/invoices/invoice-actions'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  const supabase = await createClient()

  const [{ data: invoice }, { data: lineItems }, { data: payments }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(id, company_name, contact_name, contact_email)')
      .eq('id', invoiceId)
      .single(),
    supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order'),
    supabase
      .from('invoice_payments')
      .select('*, staff:recorded_by(full_name)')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false }),
  ])

  if (!invoice) notFound()

  const client = invoice.clients as any

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{invoice.invoice_number}</h1>
            <p className="text-sm text-muted-foreground">{invoice.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge type="invoice" value={invoice.status} />
            <a 
              href={`/api/invoices/${invoice.id}/pdf`} 
              download 
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="mr-2 size-4" />
              Download PDF
            </a>
            <InvoiceActions invoice={invoice} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Client</dt>
                  <dd>
                    <Link href={`/clients/${client?.id}`} className="hover:text-primary">
                      {client?.company_name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Issue date</dt>
                  <dd>{formatDate(invoice.issue_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Due date</dt>
                  <dd className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                    {formatDate(invoice.due_date)}
                  </dd>
                </div>
                {invoice.payment_terms && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Terms</dt>
                    <dd>{invoice.payment_terms}</dd>
                  </div>
                )}
                {invoice.sent_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Sent</dt>
                    <dd>{formatDate(invoice.sent_at)}</dd>
                  </div>
                )}
                {invoice.paid_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Paid</dt>
                    <dd>{formatDate(invoice.paid_at)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatCurrency(invoice.subtotal, invoice.currency)}</dd>
                </div>
                {invoice.discount_pct > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <dt>Discount ({invoice.discount_pct}%)</dt>
                    <dd>−{formatCurrency(invoice.subtotal * invoice.discount_pct / 100, invoice.currency)}</dd>
                  </div>
                )}
                {invoice.discount_flat > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <dt>Flat discount</dt>
                    <dd>−{formatCurrency(invoice.discount_flat, invoice.currency)}</dd>
                  </div>
                )}
                {invoice.tax_pct > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Tax ({invoice.tax_pct}%)</dt>
                    <dd>{formatCurrency(invoice.tax_amount, invoice.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
                  <dt>Total</dt>
                  <dd>{formatCurrency(invoice.total, invoice.currency)}</dd>
                </div>
                {invoice.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <dt>Paid</dt>
                      <dd>{formatCurrency(invoice.amount_paid, invoice.currency)}</dd>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <dt>Balance</dt>
                      <dd>{formatCurrency(invoice.total - invoice.amount_paid, invoice.currency)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Line items + payments */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unit price</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(lineItems ?? []).map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5">{item.description}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Payment history */}
          {payments && payments.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Payment history</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Method</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Reference</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(pmt => (
                      <tr key={pmt.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5">{formatDate(pmt.paid_at)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground capitalize">
                          {pmt.method?.replace('_', ' ') ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{pmt.reference ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-600">
                          {formatCurrency(pmt.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
