import { cn } from '@/lib/utils'
import {
  PIPELINE_STAGES,
  AGREEMENT_STATUSES,
  INVOICE_STATUSES,
  OFFER_STATUSES,
} from '@/lib/constants'
import type {
  PipelineStage,
  AgreementStatus,
  InvoiceStatus,
  OfferStatus,
} from '@/types/database'

interface StatusBadgeProps {
  type: 'pipeline' | 'agreement' | 'invoice' | 'offer'
  value: string
  className?: string
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  let label = value
  let color = 'bg-slate-100 text-slate-700'

  if (type === 'pipeline') {
    const s = PIPELINE_STAGES.find(s => s.value === value)
    if (s) { label = s.label; color = s.color }
  } else if (type === 'agreement') {
    const s = AGREEMENT_STATUSES.find(s => s.value === value)
    if (s) { label = s.label; color = s.color }
  } else if (type === 'invoice') {
    const s = INVOICE_STATUSES.find(s => s.value === value)
    if (s) { label = s.label; color = s.color }
  } else if (type === 'offer') {
    const s = OFFER_STATUSES.find(s => s.value === value)
    if (s) { label = s.label; color = s.color }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        color,
        className
      )}
    >
      {label}
    </span>
  )
}
