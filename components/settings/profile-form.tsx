'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateStaffProfile } from '@/app/actions/settings'

interface ProfileFormProps {
  currentStaff: { id: string; full_name: string; email: string; role: string } | null
}

export function ProfileForm({ currentStaff }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit } = useForm({
    defaultValues: {
      full_name: currentStaff?.full_name ?? '',
    },
  })

  function onSubmit(values: { full_name: string }) {
    startTransition(async () => {
      const { error } = await updateStaffProfile(values)
      if (error) toast.error(error)
      else { toast.success('Profile updated'); router.refresh() }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={currentStaff?.email ?? ''} disabled className="opacity-60" />
        <p className="text-xs text-muted-foreground">Email is managed through authentication.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" {...register('full_name')} placeholder="Jane Smith" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Role</Label>
        <Input value={currentStaff?.role ?? ''} disabled className="opacity-60 capitalize" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
