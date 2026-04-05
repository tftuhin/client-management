'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { sendAgreement, firmSignAgreement } from '@/app/actions/agreements'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

export function AgreementActions({ agreement }: { agreement: Agreement }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSend() {
    startTransition(async () => {
      const { error } = await sendAgreement({ agreement_id: agreement.id })
      if (error) toast.error(error)
      else { toast.success('Agreement marked as sent'); router.refresh() }
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
      {agreement.status === 'signed' && !agreement.firm_signed_at && (
        <Button size="sm" onClick={handleFirmSign} disabled={isPending}>
          Counter-sign
        </Button>
      )}
    </div>
  )
}
