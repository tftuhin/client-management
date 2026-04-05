'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateAgreement } from '@/app/actions/agreements'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

interface EditableAgreementContentProps {
  agreement: Agreement
}

export function EditableAgreementContent({ agreement }: EditableAgreementContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(agreement.content)
  const [changeReason, setChangeReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const hasChanges = content !== agreement.content
  const isSigned = agreement.signed_at !== null
  const isDraft = agreement.status === 'draft'
  const canEditDirectly = isDraft && !isSigned

  function handleSave() {
    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const result = await updateAgreement(agreement.id, {
        content,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Agreement updated')
        setIsEditing(false)
      }
    })
  }

  function handleRequestChanges() {
    if (!hasChanges && !changeReason) {
      toast.error('Please describe the changes you want to make')
      return
    }

    startTransition(async () => {
      const result = await updateAgreement(agreement.id, {
        content,
        change_requested: true,
        change_reason: changeReason || 'Changes requested to agreement',
      } as any)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Change request sent to client')
        setIsEditing(false)
        setChangeReason('')
      }
    })
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-4">
        {isSigned && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/50 dark:bg-yellow-950/30">
            <div>
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-400">
                Changes require client approval
              </p>
              <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-500">
                This agreement is signed. Any changes will be tracked and require the client's approval.
              </p>
            </div>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {isSigned && (
          <textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            rows={3}
            placeholder="Explain what changes are being requested and why…"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setContent(agreement.content)
              setChangeReason('')
              setIsEditing(false)
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          {isSigned ? (
            <Button
              onClick={handleRequestChanges}
              disabled={isPending || !hasChanges}
            >
              {isPending ? 'Sending…' : 'Request changes'}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isPending || !hasChanges}
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {isSigned && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Client-approved</Badge>
          <span className="text-xs text-muted-foreground">
            This agreement is signed. Edits require client approval.
          </span>
        </div>
      )}

      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {agreement.content}
      </div>

      <Button
        onClick={() => setIsEditing(true)}
        disabled={agreement.status === 'cancelled'}
        variant={isSigned ? 'outline' : 'outline'}
      >
        {isSigned ? 'Request changes' : 'Edit content'}
      </Button>
    </div>
  )
}
