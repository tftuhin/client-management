'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

type Message = {
  id: string
  content: string
  message_type: string
  author_id: string | null
  created_at: string
}

export default function PortalMessagesPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const cid = user.user_metadata?.client_id ?? null
      setClientId(cid)
      if (!cid) return

      const { data } = await supabase
        .from('messages')
        .select('id, content, message_type, author_id, created_at')
        .eq('client_id', cid)
        .in('message_type', ['client_message', 'internal_note'])
        .order('created_at', { ascending: true })

      setMessages(data ?? [])
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !clientId || !userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: clientId,
        message_type: 'client_message',
        content: content.trim(),
        author_id: userId,
        is_pinned: false,
      })
      .select('id, content, message_type, author_id, created_at')
      .single()

    if (error) {
      toast.error('Failed to send message')
    } else if (data) {
      setMessages(prev => [...prev, data])
      setContent('')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Chat with your project manager</p>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto rounded-xl border bg-muted/20 p-4 space-y-3 min-h-[300px] max-h-[60vh]">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Send a message to your project manager.</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.author_id === userId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card ring-1 ring-foreground/10 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {isMe ? 'You' : 'Project Manager'} · {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} className="flex gap-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type your message…"
          rows={2}
          className="flex-1 resize-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
        />
        <Button type="submit" disabled={loading || !content.trim()} className="self-end">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
