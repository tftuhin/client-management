'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendAgreement, signAgreement, firmSignAgreement } from '@/app/actions/agreements'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

export function AgreementActions({ agreement }: { agreement: Agreement }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [signOpen, setSignOpen] = useState(false)
  const [signatureName, setSignatureName] = useState('')

  async function handleSend() {
    startTransition(async () => {
      const { error } = await sendAgreement({ agreement_id: agreement.id })
      if (error) toast.error(error)
      else { toast.success('Agreement marked as sent'); router.refresh() }
    })
  }

  async function handleSign() {
    if (!signatureName.trim()) return
    startTransition(async () => {
      const { error } = await signAgreement({ agreement_id: agreement.id, client_signature_name: signatureName })
      if (error) toast.error(error)
      else { toast.success('Agreement signed by client'); setSignOpen(false); router.refresh() }
    })
  }

  async function handleFirmSign() {
    startTransition(async () => {
      const { error } = await firmSignAgreement({ agreement_id: agreement.id })
      if (error) toast.error(error)
      else { toast.success('Agreement counter-signed'); router.refresh() }
    })
  }

  return (
    <div className="flex gap-2">
      {agreement.status === 'draft' && (
        <Button size="sm" onClick={handleSend} disabled={isPending}>
          Mark as sent
        </Button>
      )}
      {(agreement.status === 'sent' || agreement.status === 'viewed') && (
        <>
          <Button size="sm" variant="outline" onClick={() => setSignOpen(true)} disabled={isPending}>
            Record client signature
          </Button>
        </>
      )}
      {agreement.status === 'signed' && !agreement.firm_signed_at && (
        <Button size="sm" onClick={handleFirmSign} disabled={isPending}>
          Counter-sign
        </Button>
      )}

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record client signature</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig-name">Client's full name (as signed)</Label>
            <Input
              id="sig-name"
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSign} disabled={isPending || !signatureName.trim()}>
              {isPending ? 'Saving…' : 'Record signature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
