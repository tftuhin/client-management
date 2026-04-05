'use client'

import { useTransition, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createInvoiceSchema, type CreateInvoiceInput } from '@/lib/validations/invoice'
import { createInvoice } from '@/app/actions/invoices'
import { CURRENCIES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import type { Database } from '@/types/database'

type Client = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'company_name'>
type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name'>
type Agreement = Pick<Database['public']['Tables']['agreements']['Row'], 'id' | 'title' | 'status'>

interface InvoiceFormProps {
  clients: Client[]
  projects?: Project[]
  agreements?: Agreement[]
  defaultClientId?: string
  defaultProjectId?: string
  onSuccess?: () => void
}

export function InvoiceForm({ clients, projects, agreements, defaultClientId, defaultProjectId, onSuccess }: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema) as any,
    defaultValues: {
      client_id: defaultClientId ?? '',
      project_id: defaultProjectId ?? undefined,
      title: '',
      currency: 'USD',
      discount_pct: 0,
      discount_flat: 0,
      tax_pct: 0,
      issue_date: today,
      due_date: thirtyDays,
      line_items: [{ description: '', quantity: 1, unit_price: 0, sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' })

  const watchedItems = watch('line_items')
  const watchedTaxPct = watch('tax_pct') ?? 0
  const watchedDiscountPct = watch('discount_pct') ?? 0
  const watchedDiscountFlat = watch('discount_flat') ?? 0
  const watchedCurrency = watch('currency') ?? 'USD'

  const subtotal = (watchedItems ?? []).reduce((sum, item) => {
    return sum + ((item.quantity || 0) * (item.unit_price || 0))
  }, 0)

  const discountAmount = (subtotal * watchedDiscountPct / 100) + Number(watchedDiscountFlat || 0)
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * watchedTaxPct / 100
  const total = taxableAmount + taxAmount

  function onSubmit(values: CreateInvoiceInput) {
    startTransition(async () => {
      const result = await createInvoice(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Invoice created')
        onSuccess?.()
        router.push(`/invoices/${result.data!.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Client *</Label>
          <Controller
            name="client_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id} label={c.company_name}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Currency</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c} label={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <Controller
              name="project_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || undefined)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Link to project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" label="No project">No project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} label={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {agreements && agreements.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Agreement</Label>
              <Controller
                name="agreement_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || undefined)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Link to agreement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" label="No agreement">No agreement</SelectItem>
                      {agreements.map(a => (
                        <SelectItem key={a.id} value={a.id} label={`${a.title} (${a.status})`}>{a.title} ({a.status})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Invoice title *</Label>
        <Input id="title" {...register('title')} placeholder="Website Redesign — Phase 1" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issue_date">Issue date *</Label>
          <Input id="issue_date" type="date" {...register('issue_date')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due_date">Due date *</Label>
          <Input id="due_date" type="date" {...register('due_date')} />
          {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
        </div>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0, sort_order: fields.length })}
          >
            <Plus className="size-3" />
            Add item
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {fields.map((field, idx) => {
            const qty = watchedItems?.[idx]?.quantity || 0
            const price = watchedItems?.[idx]?.unit_price || 0
            const amount = qty * price
            return (
              <div key={field.id} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 px-3 py-2 border-t items-center">
                <Input
                  {...register(`line_items.${idx}.description`)}
                  placeholder="Description"
                  className="h-7 text-xs"
                />
                <Input
                  {...register(`line_items.${idx}.quantity`)}
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-7 text-xs"
                />
                <Input
                  {...register(`line_items.${idx}.unit_price`)}
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-7 text-xs"
                />
                <span className="text-xs text-right font-medium">
                  {formatCurrency(amount, watchedCurrency)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  disabled={fields.length === 1}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, watchedCurrency)}</span>
            </div>
            {(watchedDiscountPct > 0 || watchedDiscountFlat > 0) && (
              <div className="flex justify-between text-amber-600">
                <span>Discount</span>
                <span>−{formatCurrency(discountAmount, watchedCurrency)}</span>
              </div>
            )}
            {watchedTaxPct > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({watchedTaxPct}%)</span>
                <span>{formatCurrency(taxAmount, watchedCurrency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total</span>
              <span>{formatCurrency(total, watchedCurrency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discounts & tax */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discount_pct">Discount %</Label>
          <Input id="discount_pct" type="number" min={0} max={100} step="0.01" {...register('discount_pct')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discount_flat">Flat discount</Label>
          <Input id="discount_flat" type="number" min={0} step="0.01" {...register('discount_flat')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tax_pct">Tax %</Label>
          <Input id="tax_pct" type="number" min={0} max={100} step="0.01" {...register('tax_pct')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payment_terms">Payment terms</Label>
          <Input id="payment_terms" {...register('payment_terms')} placeholder="Net 30" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Additional notes for the client…" rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create invoice'}
        </Button>
      </div>
    </form>
  )
}
