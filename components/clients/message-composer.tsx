'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createMessage } from '@/app/actions/messages'
import { toast } from 'sonner'

export function MessageComposer({ clientId }: { clientId: string }) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<'internal_note' | 'client_message'>('internal_note')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const { error } = await createMessage({ client_id: clientId, message_type: type, content, is_pinned: false })
      if (error) {
        toast.error(error)
      } else {
        setContent('')
        toast.success('Note added')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        {(['internal_note', 'client_message'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              type === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'internal_note' ? '🔒 Internal note' : '📤 Client message'}
          </button>
        ))}
      </div>
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={type === 'internal_note' ? 'Write an internal note…' : 'Write a client message…'}
        rows={3}
      />
      <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
        {isPending ? 'Saving…' : 'Add note'}
      </Button>
    </form>
  )
}
