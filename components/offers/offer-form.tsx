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
import { createOfferSchema, type CreateOfferInput } from '@/lib/validations/offer'
import { createOffer } from '@/app/actions/offers'
import type { Database } from '@/types/database'

type Client = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'company_name'>

const SERVICE_TYPES = [
  'Website Design', 'Web Application', 'E-commerce', 'Mobile App',
  'API Development', 'SEO / Marketing', 'Maintenance', 'Redesign', 'Consulting', 'Other',
]

interface OfferFormProps {
  clients?: Client[]
  defaultClientId?: string
  onSuccess?: () => void
}

export function OfferForm({ clients, defaultClientId, onSuccess }: OfferFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateOfferInput>({
    resolver: zodResolver(createOfferSchema) as any,
    defaultValues: {
      client_id: defaultClientId ?? '',
      title: '',
      service_type: '',
      description: '',
    },
  })

  function onSubmit(values: CreateOfferInput) {
    startTransition(async () => {
      const result = await createOffer(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Offer added to pipeline')
        onSuccess?.()
        router.push(`/clients/${values.client_id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {clients && (
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
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Offer title *</Label>
        <Input id="title" {...register('title')} placeholder="Phase 2 — Mobile App" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Service type *</Label>
          <Controller
            name="service_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => (
                    <SelectItem key={s} value={s} label={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.service_type && <p className="text-xs text-destructive">{errors.service_type.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimated_value">Estimated value</Label>
          <Input id="estimated_value" type="number" min={0} step="0.01" {...register('estimated_value')} placeholder="5000" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="follow_up_date">Follow-up date (when to pitch)</Label>
        <Input id="follow_up_date" type="date" {...register('follow_up_date')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} placeholder="What are you offering and why now?" rows={3} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Add to pipeline'}
        </Button>
      </div>
    </form>
  )
}
