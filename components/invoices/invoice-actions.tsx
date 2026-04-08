'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sendInvoice, recordPayment } from '@/app/actions/invoices'
import type { Database } from '@/types/database'

type Invoice = Database['public']['Tables']['invoices']['Row']

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')

  // Reset amount whenever the dialog opens or invoice data changes
  useEffect(() => {
    if (paymentOpen) {
      const remaining = invoice.total - invoice.amount_paid
      setAmount(String(remaining > 0 ? remaining : 0))
    }
  }, [paymentOpen, invoice.total, invoice.amount_paid])

  async function handleSend() {
    startTransition(async () => {
      const { error } = await sendInvoice(invoice.id)
      if (error) toast.error(error)
      else { toast.success('Invoice sent'); router.refresh() }
    })
  }

  async function handleRecordPayment() {
    const paymentAmount = parseFloat(amount)
    const remaining = invoice.total - invoice.amount_paid

    if (paymentAmount > remaining) {
      toast.error(`Payment cannot exceed remaining balance of $${remaining.toFixed(2)}`)
      return
    }

    startTransition(async () => {
      const { error } = await recordPayment({
        invoice_id: invoice.id,
        amount: paymentAmount,
        method: method as any,
        reference: reference || undefined,
      })
      if (error) toast.error(error)
      else { toast.success('Payment recorded'); setPaymentOpen(false); router.refresh() }
    })
  }

  return (
    <div className="flex gap-2">
      {invoice.status === 'draft' && (
        <Button size="sm" onClick={handleSend} disabled={isPending}>
          Mark as sent
        </Button>
      )}
      {['sent', 'viewed', 'partially_paid', 'overdue'].includes(invoice.status) && (
        <Button size="sm" onClick={() => setPaymentOpen(true)} disabled={isPending}>
          Record payment
        </Button>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => v && setMethod(v)} items={PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value} label={m.label}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Reference (optional)</Label>
              <Input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Transaction ID, cheque number…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleRecordPayment}
              disabled={isPending || !amount || parseFloat(amount) > (invoice.total - invoice.amount_paid)}
            >
              {isPending ? 'Saving…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
