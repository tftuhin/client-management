'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateFirmSettings, type UpdateFirmSettingsInput } from '@/app/actions/settings'
import { CURRENCIES } from '@/lib/constants'

interface FirmSettingsFormProps {
  settings: any
  isOwner: boolean
}

export function FirmSettingsForm({ settings, isOwner }: FirmSettingsFormProps) {
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, control } = useForm<UpdateFirmSettingsInput>({
    defaultValues: {
      firm_name: settings?.firm_name ?? '',
      firm_email: settings?.firm_email ?? '',
      firm_phone: settings?.firm_phone ?? '',
      firm_address: settings?.firm_address ?? '',
      default_currency: settings?.default_currency ?? 'USD',
      default_tax_pct: settings?.default_tax_pct ?? 0,
      default_payment_terms: settings?.default_payment_terms ?? '',
      invoice_prefix: settings?.invoice_prefix ?? 'INV',
      invoice_footer: settings?.invoice_footer ?? '',
    },
  })

  function onSubmit(values: UpdateFirmSettingsInput) {
    startTransition(async () => {
      const { error } = await updateFirmSettings(values)
      if (error) toast.error(error)
      else toast.success('Settings saved')
    })
  }

  if (!isOwner) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Only the account owner can modify firm settings.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firm_name">Firm name</Label>
          <Input id="firm_name" {...register('firm_name')} placeholder="Acme Web Studio" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firm_email">Firm email</Label>
          <Input id="firm_email" type="email" {...register('firm_email')} placeholder="hello@example.com" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firm_phone">Phone</Label>
          <Input id="firm_phone" {...register('firm_phone')} placeholder="+1 555-000-0000" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoice_prefix">Invoice prefix</Label>
          <Input id="invoice_prefix" {...register('invoice_prefix')} placeholder="INV" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="firm_address">Address</Label>
        <Textarea id="firm_address" {...register('firm_address')} placeholder="123 Main St, City, Country" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Default currency</Label>
          <Controller
            name="default_currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? 'USD'} onValueChange={field.onChange}>
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="default_tax_pct">Default tax %</Label>
          <Input id="default_tax_pct" type="number" min={0} max={100} step="0.01" {...register('default_tax_pct')} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="default_payment_terms">Default payment terms</Label>
        <Input id="default_payment_terms" {...register('default_payment_terms')} placeholder="Net 30" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invoice_footer">Invoice footer</Label>
        <Textarea id="invoice_footer" {...register('invoice_footer')} placeholder="Thank you for your business!" rows={2} />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  )
}
