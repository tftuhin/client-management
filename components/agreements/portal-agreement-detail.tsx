'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { requestAgreementChanges, signAgreement } from '@/app/actions/agreements'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

interface PortalAgreementDetailProps {
  agreement: Agreement
}

export function PortalAgreementDetail({ agreement }: PortalAgreementDetailProps) {
  const [signatureName, setSignatureName] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const canSign = agreement.status === 'sent' || agreement.status === 'viewed'
  const canRequestChanges = agreement.status !== 'draft' && agreement.status !== 'cancelled' && agreement.status !== 'expired'

  async function handleSign() {
    if (!signatureName.trim()) {
      toast.error('Enter your full name before signing')
      return
    }

    startTransition(async () => {
      const { error } = await signAgreement({ agreement_id: agreement.id, client_signature_name: signatureName.trim() })
      if (error) {
        toast.error(error)
      } else {
        toast.success('Agreement signed successfully')
        window.location.reload()
      }
    })
  }

  async function handleRequestChanges() {
    if (!changeReason.trim()) {
      toast.error('Describe the change request to continue')
      return
    }

    startTransition(async () => {
      const { error } = await requestAgreementChanges({
        agreement_id: agreement.id,
        change_reason: changeReason.trim(),
      })

      if (error) {
        toast.error(error)
      } else {
        toast.success('Change request submitted')
        setChangeReason('')
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-6">
      {agreement.change_requested && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Change requested:</p>
          <p className="mt-1">{agreement.change_reason ?? 'A change has been requested for this agreement.'}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{agreement.status}</Badge>
          {agreement.signed_at && <Badge variant="outline">Signed</Badge>}
          {agreement.firm_signed_at && <Badge variant="outline">Firm signed</Badge>}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {agreement.content}
          </div>
        </div>
      </div>

      {canSign && (
        <div className="rounded-xl border bg-card p-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Sign this agreement</p>
              <p className="text-xs text-muted-foreground">Enter your full name to sign on behalf of your company.</p>
            </div>
            <div className="space-y-2">
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Full name"
              />
              <Button onClick={handleSign} disabled={isPending || !signatureName.trim()}>
                {isPending ? 'Signing…' : 'Sign agreement'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {canRequestChanges && (
        <div className="rounded-xl border bg-card p-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Request changes</p>
              <p className="text-xs text-muted-foreground">Ask the firm to revise this agreement and send you an updated version.</p>
            </div>
            <Textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              rows={4}
              placeholder="Describe the changes you need..."
            />
            <Button onClick={handleRequestChanges} disabled={isPending || !changeReason.trim()}>
              {isPending ? 'Submitting…' : 'Request changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
