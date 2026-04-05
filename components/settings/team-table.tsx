'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { updateStaffRole } from '@/app/actions/settings'
import { getInitials, formatDate } from '@/lib/utils'

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface TeamTableProps {
  staff: StaffMember[]
  currentUserId: string
  isAdmin: boolean
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export function TeamTable({ staff, currentUserId, isAdmin }: TeamTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(staffId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    startTransition(async () => {
      const { error } = await updateStaffRole(staffId, newRole)
      if (error) toast.error(error)
      else { toast.success('Role updated'); router.refresh() }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {staff.length} team {staff.length === 1 ? 'member' : 'members'}. New members are added automatically when they sign in.
      </p>
      <div className="rounded-xl ring-1 ring-foreground/10 divide-y overflow-hidden">
        {staff.map(member => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.full_name}
                {member.id === currentUserId && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              {isAdmin && member.id !== currentUserId && member.role !== 'owner' && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleRoleChange(member.id, member.role)}
                  disabled={isPending}
                >
                  {member.role === 'admin' ? 'Make member' : 'Make admin'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
