'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Database } from '@/types/database'

type Message = Database['public']['Tables']['messages']['Row']

const createMessageSchema = z.object({
  client_id: z.string().uuid(),
  message_type: z.enum(['internal_note', 'client_message', 'system_event']),
  content: z.string().min(1, 'Message cannot be empty').max(10000),
  is_pinned: z.boolean().default(false),
  linked_entity_type: z.string().optional(),
  linked_entity_id: z.string().uuid().optional(),
})

const updateMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  is_pinned: z.boolean().optional(),
})

export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>

export async function createMessage(
  raw: CreateMessageInput
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = createMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ ...parsed.data, author_id: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath(`/clients/${parsed.data.client_id}`)
  return { data, error: null }
}

export async function updateMessage(
  messageId: string,
  clientId: string,
  raw: UpdateMessageInput
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('messages')
    .update(parsed.data)
    .eq('id', messageId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath(`/clients/${clientId}`)
  return { data, error: null }
}

export async function deleteMessage(
  messageId: string,
  clientId: string
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase.from('messages').delete().eq('id', messageId)
  if (error) return { data: null, error: error.message }

  revalidatePath(`/clients/${clientId}`)
  return { data: null, error: null }
}
