'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateProjectAction } from '@/app/actions/projects'
import type { ProjectStatus } from '@/types/database'

interface ProjectStatusActionsProps {
  projectId: string
  status: ProjectStatus
  hasSignedAgreement: boolean
}

const STATUS_TRANSITIONS: Record<ProjectStatus, { label: string; next: ProjectStatus; variant?: 'destructive' | 'outline' | 'default' }[]> = {
  planning: [{ label: 'Activate project', next: 'active', variant: 'default' }],
  active: [
    { label: 'Put on hold', next: 'on_hold', variant: 'outline' },
    { label: 'Mark completed', next: 'completed', variant: 'default' },
  ],
  on_hold: [
    { label: 'Resume project', next: 'active', variant: 'default' },
    { label: 'Cancel project', next: 'cancelled', variant: 'destructive' },
  ],
  completed: [],
  cancelled: [],
}

export function ProjectStatusActions({ projectId, status, hasSignedAgreement }: ProjectStatusActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const transitions = STATUS_TRANSITIONS[status] ?? []

  if (transitions.length === 0) return null

  function handleTransition(next: ProjectStatus) {
    if (next === 'active' && !hasSignedAgreement) {
      toast.error('A signed agreement is required before activating this project')
      return
    }
    startTransition(async () => {
      const result = await updateProjectAction(projectId, { status: next })
      if (result.error) toast.error(result.error)
      else { toast.success('Project status updated'); router.refresh() }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {transitions.map(t => (
        <Button
          key={t.next}
          size="sm"
          variant={t.variant ?? 'default'}
          disabled={isPending}
          onClick={() => handleTransition(t.next)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
