'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateAgreement } from '@/app/actions/agreements'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

interface EditableAgreementContentProps {
  agreement: Agreement
}

export function EditableAgreementContent({ agreement }: EditableAgreementContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(agreement.content)
  const [isPending, startTransition] = useTransition()

  const hasChanges = content !== agreement.content

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

  if (isEditing) {
    return (
      <div className="flex flex-col gap-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setContent(agreement.content)
              setIsEditing(false)
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {agreement.content}
      </div>
      <Button
        variant="outline"
        onClick={() => setIsEditing(true)}
        disabled={agreement.status !== 'draft'}
      >
        Edit content
      </Button>
    </div>
  )
}
