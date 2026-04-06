'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/lib/validations/client'
import { createClientAction, updateClientAction } from '@/app/actions/clients'
import { PIPELINE_STAGES, INDUSTRIES, LEAD_SOURCES } from '@/lib/constants'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

interface ClientFormProps {
  client?: Client
  onSuccess?: () => void
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!client

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(isEditing ? updateClientSchema : createClientSchema) as any,
    defaultValues: client
      ? {
          company_name: client.company_name,
          contact_name: client.contact_name,
          contact_email: client.contact_email,
          contact_phone: client.contact_phone ?? '',
          website_url: client.website_url ?? '',
          industry: client.industry ?? '',
          pipeline_stage: client.pipeline_stage,
          lead_source: client.lead_source ?? '',
          notes: client.notes ?? '',
          country: client.country ?? '',
          address: client.address ?? '',
          linkedin_url: client.linkedin_url ?? '',
          vat_id: client.vat_id ?? '',
        }
      : {
          pipeline_stage: 'lead',
        },
  })

  function onSubmit(values: CreateClientInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateClientAction(client!.id, values as UpdateClientInput)
        : await createClientAction(values)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEditing ? 'Client updated' : 'Client created')
        onSuccess?.()
        if (!isEditing) {
          router.push(`/clients/${result.data!.id}`)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company_name">Company name *</Label>
          <Input id="company_name" {...register('company_name')} placeholder="Acme Corp" />
          {errors.company_name && (
            <p className="text-xs text-destructive">{errors.company_name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_name">Contact name *</Label>
          <Input id="contact_name" {...register('contact_name')} placeholder="Jane Smith" />
          {errors.contact_name && (
            <p className="text-xs text-destructive">{errors.contact_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_email">Email *</Label>
          <Input id="contact_email" type="email" {...register('contact_email')} placeholder="jane@example.com" />
          {errors.contact_email && (
            <p className="text-xs text-destructive">{errors.contact_email.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_phone">Phone</Label>
          <Input id="contact_phone" {...register('contact_phone')} placeholder="+1 555-000-0000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="website_url">Website</Label>
          <Input id="website_url" {...register('website_url')} placeholder="https://example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...register('country')} placeholder="United States" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input id="linkedin_url" {...register('linkedin_url')} placeholder="https://linkedin.com/company/acme" />
          {errors.linkedin_url && <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vat_id">VAT/TAX ID</Label>
          <Input id="vat_id" {...register('vat_id')} placeholder="GB123456789" />
          {errors.vat_id && <p className="text-xs text-destructive">{errors.vat_id.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} placeholder="123 Business Rd, City, State ZIP" />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Pipeline stage</Label>
          <Controller
            name="pipeline_stage"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? 'lead'} onValueChange={field.onChange} items={PIPELINE_STAGES.map(s => ({ value: s.value, label: s.label }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value} label={s.label}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Industry</Label>
          <Controller
            name="industry"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange} items={INDUSTRIES.map(i => ({ value: i, label: i }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => (
                    <SelectItem key={i} value={i} label={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Lead source</Label>
        <Controller
          name="lead_source"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange} items={LEAD_SOURCES.map(s => ({ value: s, label: s }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="How did they find you?" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map(s => (
                  <SelectItem key={s} value={s} label={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Any additional notes…" rows={3} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create client'}
        </Button>
      </div>
    </form>
  )
}
