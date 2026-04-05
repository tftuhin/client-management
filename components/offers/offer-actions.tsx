'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { proposeOffer, respondToOffer, deleteOffer } from '@/app/actions/offers'

interface OfferActionsProps {
  offerId: string
  clientId: string
  status: string
}

export function OfferActions({ offerId, clientId, status }: OfferActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handlePropose() {
    startTransition(async () => {
      const r = await proposeOffer({ offer_id: offerId })
      if (r.error) toast.error(r.error)
      else { toast.success('Marked as proposed'); router.refresh() }
    })
  }

  function handleRespond(response: 'accepted' | 'declined') {
    startTransition(async () => {
      const r = await respondToOffer({ offer_id: offerId, response })
      if (r.error) toast.error(r.error)
      else { toast.success(`Offer ${response}`); router.refresh() }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const r = await deleteOffer(offerId, clientId)
      if (r.error) toast.error(r.error)
      else { toast.success('Offer removed'); router.refresh() }
    })
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {status === 'draft' && (
        <button onClick={handlePropose} disabled={isPending}
          className="text-primary hover:underline disabled:opacity-50">
          Propose
        </button>
      )}
      {status === 'proposed' && (
        <>
          <button onClick={() => handleRespond('accepted')} disabled={isPending}
            className="text-emerald-600 hover:underline disabled:opacity-50">
            Accepted
          </button>
          <button onClick={() => handleRespond('declined')} disabled={isPending}
            className="text-red-500 hover:underline disabled:opacity-50">
            Declined
          </button>
        </>
      )}
      {['draft', 'declined'].includes(status) && (
        <button onClick={handleDelete} disabled={isPending}
          className="text-muted-foreground hover:text-destructive disabled:opacity-50">
          Delete
        </button>
      )}
    </div>
  )
}
