'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { updateStaffRole } from '@/app/actions/settings'
import { getInitials } from '@/lib/utils'

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
  project_manager: 'Project Manager',
  member: 'Member',
}

export function TeamTable({ staff, currentUserId, isAdmin }: TeamTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'project_manager' | 'member'>('project_manager')
  const [inviting, setInviting] = useState(false)

  function handleRoleChange(staffId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    startTransition(async () => {
      const { error } = await updateStaffRole(staffId, newRole)
      if (error) toast.error(error)
      else { toast.success('Role updated'); router.refresh() }
    })
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/invite-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send invite')
      } else {
        toast.success(`Invite sent to ${inviteEmail.trim()}`)
        setInviteEmail('')
        setShowInvite(false)
        router.refresh()
      }
    } catch {
      toast.error('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {staff.length} team {staff.length === 1 ? 'member' : 'members'}
        </p>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowInvite(v => !v)}>
            {showInvite ? 'Cancel' : '+ Invite Member'}
          </Button>
        )}
      </div>

      {showInvite && (
        <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Invite a team member</p>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="member">Member</option>
            </select>
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>
        </div>
      )}

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
