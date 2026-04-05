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
import { createProjectSchema, updateProjectSchema, type CreateProjectInput, type UpdateProjectInput } from '@/lib/validations/project'
import { createProjectAction, updateProjectAction } from '@/app/actions/projects'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']
type Client = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'company_name'>
type Staff = Pick<Database['public']['Tables']['staff']['Row'], 'id' | 'full_name'>

interface ProjectFormProps {
  project?: Project
  clients?: Client[]
  staff?: Staff[]
  defaultClientId?: string
  onSuccess?: () => void
}

export function ProjectForm({ project, clients, staff, defaultClientId, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!project

  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateProjectInput>({
    resolver: zodResolver(isEditing ? updateProjectSchema : createProjectSchema) as any,
    defaultValues: project
      ? { name: project.name, description: project.description ?? '', assigned_to: project.assigned_to ?? undefined }
      : { client_id: defaultClientId ?? '', name: '', description: '' },
  })

  function onSubmit(values: CreateProjectInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateProjectAction(project!.id, values as UpdateProjectInput)
        : await createProjectAction(values)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEditing ? 'Project updated' : 'Project created')
        onSuccess?.()
        if (!isEditing) router.push(`/projects/${result.data!.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {!isEditing && clients && (
        <div className="flex flex-col gap-1.5">
          <Label>Client *</Label>
          <Controller
            name="client_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} items={clients.map(c => ({ value: c.id, label: c.company_name }))}>
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
          {(errors as any).client_id && <p className="text-xs text-destructive">{(errors as any).client_id.message}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Project name *</Label>
        <Input id="name" {...register('name')} placeholder="Website Redesign" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} placeholder="Briefly describe the project scope…" rows={3} />
      </div>

      {staff && (
        <div className="flex flex-col gap-1.5">
          <Label>Assigned PM</Label>
          <Controller
            name="assigned_to"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || null)} items={[{ value: '', label: 'Unassigned' }, ...(staff ?? []).map(s => ({ value: s.id, label: s.full_name }))]}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" label="Unassigned">Unassigned</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id} label={s.full_name}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  )
}
