'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAgreementSchema, type CreateAgreementInput } from '@/lib/validations/agreement'
import { createAgreement } from '@/app/actions/agreements'
import type { Database } from '@/types/database'

type Client = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'company_name'>
type Template = Database['public']['Tables']['agreement_templates']['Row']
type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name'>

interface AgreementFormProps {
  clients: Client[]
  templates: Template[]
  projects?: Project[]
  defaultClientId?: string
  defaultProjectId?: string
  onSuccess?: () => void
}

export function AgreementForm({ clients, templates, projects, defaultClientId, defaultProjectId, onSuccess }: AgreementFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<CreateAgreementInput>({
    resolver: zodResolver(createAgreementSchema),
    defaultValues: {
      client_id: defaultClientId ?? '',
      project_id: defaultProjectId ?? undefined,
      title: '',
      content: '',
    },
  })

  const selectedTemplate = watch('template_used')

  function handleTemplateSelect(templateId: string | null) {
    if (!templateId) return
    setValue('template_used', templateId)
    const tpl = templates.find(t => t.id === templateId)
    if (tpl) {
      setValue('title', tpl.name)
      setValue('content', tpl.content)
    }
  }

  function onSubmit(values: CreateAgreementInput) {
    startTransition(async () => {
      const result = await createAgreement(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Agreement created')
        onSuccess?.()
        router.push(`/agreements/${result.data!.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
      </div>

      {projects && projects.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Project (optional)</Label>
          <Controller
            name="project_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Link to a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {templates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Template (optional)</Label>
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Start from a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" {...register('title')} placeholder="Web Development Agreement" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content">Content *</Label>
        <textarea
          id="content"
          {...register('content')}
          rows={12}
          placeholder="Enter the agreement terms and conditions…"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 font-mono"
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expires_at">Expiry date (optional)</Label>
        <Input id="expires_at" type="datetime-local" {...register('expires_at')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create agreement'}
        </Button>
      </div>
    </form>
  )
}
