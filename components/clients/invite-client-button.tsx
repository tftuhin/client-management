'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { UserPlus, CheckCircle } from 'lucide-react'

interface InviteClientButtonProps {
  clientId: string
  email: string
  hasPortalAccess: boolean
}

export function InviteClientButton({ clientId, email, hasPortalAccess }: InviteClientButtonProps) {
  const [loading, setLoading] = useState(false)
  const [invited, setInvited] = useState(false)

  async function handleInvite() {
    setLoading(true)
    try {
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, email }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? 'Invitation failed')
      } else {
        toast.success(`Invitation sent to ${email}`)
        setInvited(true)
      }
    } catch {
      toast.error('Unexpected error sending invitation')
    } finally {
      setLoading(false)
    }
  }

  if (hasPortalAccess) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
        <CheckCircle className="size-3.5" />
        Portal Active
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInvite}
      disabled={loading || invited}
      className="gap-1.5"
    >
      <UserPlus className="size-3.5" />
      {loading ? 'Sending…' : invited ? 'Invited!' : 'Invite to Portal'}
    </Button>
  )
}
