'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createProjectAction } from './projects'
import {
  createOfferSchema,
  updateOfferSchema,
  proposeOfferSchema,
  respondToOfferSchema,
  type CreateOfferInput,
  type UpdateOfferInput,
  type ProposeOfferInput,
  type RespondToOfferInput,
} from '@/lib/validations/offer'
import type { Database } from '@/types/database'

type Offer = Database['public']['Tables']['next_offers']['Row']

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    client_id?: string | null
    actor_id: string
    event_type: string
    description: string
    metadata?: Record<string, unknown>
  }
) {
  await supabase.from('activity_log').insert({
    client_id: payload.client_id ?? null,
    actor_id: payload.actor_id,
    event_type: payload.event_type,
    description: payload.description,
    metadata: payload.metadata ?? {},
  })
}

export async function createOffer(
  raw: CreateOfferInput
): Promise<{ data: Offer | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = createOfferSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('next_offers')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: parsed.data.client_id,
    actor_id: user.id,
    event_type: 'offer_created',
    description: `Offer "${data.title}" was created`,
    metadata: { offer_id: data.id },
  })

  revalidatePath(`/clients/${parsed.data.client_id}`)
  return { data, error: null }
}

export async function updateOffer(
  offerId: string,
  clientId: string,
  raw: UpdateOfferInput
): Promise<{ data: Offer | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateOfferSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('next_offers')
    .update(parsed.data)
    .eq('id', offerId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath(`/clients/${clientId}`)
  return { data, error: null }
}

export async function proposeOffer(
  raw: ProposeOfferInput
): Promise<{ data: Offer | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = proposeOfferSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('next_offers')
    .update({
      status: 'proposed',
      proposed_at: new Date().toISOString(),
      follow_up_date: parsed.data.follow_up_date ?? null,
    })
    .eq('id', parsed.data.offer_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: data.client_id,
    actor_id: user.id,
    event_type: 'offer_proposed',
    description: `Offer "${data.title}" was proposed`,
    metadata: { offer_id: data.id },
  })

  revalidatePath(`/clients/${data.client_id}`)
  return { data, error: null }
}

export async function respondToOffer(
  raw: RespondToOfferInput
): Promise<{ data: Offer | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = respondToOfferSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('next_offers')
    .update({
      status: parsed.data.response,
      responded_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.offer_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // If offer is accepted, create a new project
  if (parsed.data.response === 'accepted') {
    const projectResult = await createProjectAction({
      client_id: data.client_id,
      name: data.title,
      description: data.description || `${data.service_type} project`,
    })

    if (projectResult.error) {
      // Log the error but don't fail the offer acceptance
      console.error('Failed to create project from accepted offer:', projectResult.error)
    }
  }

  await logActivity(supabase, {
    client_id: data.client_id,
    actor_id: user.id,
    event_type: `offer_${parsed.data.response}`,
    description: `Offer "${data.title}" was ${parsed.data.response}`,
    metadata: { offer_id: data.id },
  })

  revalidatePath(`/clients/${data.client_id}`)
  return { data, error: null }
}

export async function deleteOffer(
  offerId: string,
  clientId: string
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase.from('next_offers').delete().eq('id', offerId)
  if (error) return { data: null, error: error.message }

  revalidatePath(`/clients/${clientId}`)
  return { data: null, error: null }
}
