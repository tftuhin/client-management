'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createAgreementSchema,
  updateAgreementSchema,
  sendAgreementSchema,
  signAgreementSchema,
  firmSignAgreementSchema,
  requestAgreementChangesSchema,
  type CreateAgreementInput,
  type UpdateAgreementInput,
  type SendAgreementInput,
  type SignAgreementInput,
  type FirmSignAgreementInput,
  type RequestAgreementChangesInput,
} from '@/lib/validations/agreement'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

// ============================================================
// Helper: log an activity event
// ============================================================

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

// ============================================================
// createAgreement
// ============================================================

export async function createAgreement(
  raw: CreateAgreementInput
): Promise<{ data: Agreement | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = createAgreementSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  // Convert datetime-local string to ISO (empty string → null)
  const expiresAt = parsed.data.expires_at
    ? (() => { const d = new Date(parsed.data.expires_at!); return isNaN(d.getTime()) ? null : d.toISOString() })()
    : null

  const { data, error } = await supabase
    .from('agreements')
    .insert({
      ...parsed.data,
      expires_at: expiresAt,
      status: 'draft',
      version: 1,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: parsed.data.client_id,
    actor_id: user.id,
    event_type: 'agreement_created',
    description: `Agreement "${data.title}" was created`,
    metadata: { agreement_id: data.id },
  })

  revalidatePath(`/clients/${parsed.data.client_id}`)
  revalidatePath('/agreements')
  return { data, error: null }
}

// ============================================================
// updateAgreement
// ============================================================

export async function updateAgreement(
  agreementId: string,
  raw: UpdateAgreementInput
): Promise<{ data: Agreement | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateAgreementSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  // Prevent editing sent/signed agreements unless admin
  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('status, client_id, title')
    .eq('id', agreementId)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  if (['signed', 'sent'].includes(existing.status)) {
    const { data: staff } = await supabase
      .from('staff')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!staff || !['owner', 'admin'].includes(staff.role)) {
      return { data: null, error: 'Cannot edit a sent or signed agreement without admin permission' }
    }
  }

  const updatePayload = {
    ...parsed.data,
    ...(parsed.data.change_requested && existing.status === 'signed'
      ? {
          status: 'sent',
          signed_at: null,
          client_signature_name: null,
          firm_signed_at: null,
          firm_signer: null,
        }
      : {}),
  }

  const { data, error } = await supabase
    .from('agreements')
    .update(updatePayload)
    .eq('id', agreementId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_updated',
    description: `Agreement "${existing.title}" was updated`,
    metadata: { agreement_id: agreementId },
  })

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  revalidatePath(`/agreements/${agreementId}`)
  return { data, error: null }
}

// ============================================================
// requestAgreementChanges
// ============================================================

export async function requestAgreementChanges(
  raw: RequestAgreementChangesInput
): Promise<{ data: Agreement | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  if (user.user_metadata?.user_type !== 'client') {
    return { data: null, error: 'Only clients can request agreement changes' }
  }

  const parsed = requestAgreementChangesSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('status, client_id, title')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }
  if (user.user_metadata?.client_id !== existing.client_id) {
    return { data: null, error: 'Unauthorized' }
  }

  if (!['sent', 'viewed', 'signed'].includes(existing.status)) {
    return { data: null, error: 'You can only request changes on sent or signed agreements' }
  }

  const updatePayload = {
    change_requested: true,
    change_reason: parsed.data.change_reason,
    ...(existing.status === 'signed'
      ? {
          status: 'sent',
          signed_at: null,
          client_signature_name: null,
          firm_signed_at: null,
          firm_signer: null,
        }
      : {}),
  }

  const { data, error } = await supabase
    .from('agreements')
    .update(updatePayload)
    .eq('id', parsed.data.agreement_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_change_requested',
    description: `Client requested changes for agreement "${existing.title}"`,
    metadata: { agreement_id: parsed.data.agreement_id },
  })

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  revalidatePath(`/portal/agreements/${parsed.data.agreement_id}`)

  return { data, error: null }
}

// ============================================================
// sendAgreement
// ============================================================

export async function sendAgreement(
  raw: SendAgreementInput
): Promise<{ data: Agreement | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = sendAgreementSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('status, client_id, title')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  if (existing.status === 'signed') {
    return { data: null, error: 'Agreement is already signed' }
  }

  const { data, error } = await supabase
    .from('agreements')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: user.id,
      ...(parsed.data.expires_at ? { expires_at: parsed.data.expires_at } : {}),
    })
    .eq('id', parsed.data.agreement_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_sent',
    description: `Agreement "${existing.title}" was sent to the client`,
    metadata: { agreement_id: parsed.data.agreement_id },
  })

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  revalidatePath(`/agreements/${parsed.data.agreement_id}`)
  return { data, error: null }
}

// ============================================================
// signAgreement (records client signature)
// ============================================================

export async function signAgreement(
  raw: SignAgreementInput
): Promise<{ data: Agreement | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = signAgreementSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('status, client_id, title')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  if (existing.status === 'signed') {
    return { data: null, error: 'Agreement has already been signed' }
  }

  if (existing.status === 'cancelled') {
    return { data: null, error: 'Cannot sign a cancelled agreement' }
  }

  if (existing.status === 'expired') {
    return { data: null, error: 'Cannot sign an expired agreement' }
  }

  const { data, error } = await supabase
    .from('agreements')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      client_signature_name: parsed.data.client_signature_name,
    })
    .eq('id', parsed.data.agreement_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_signed',
    description: `Agreement "${existing.title}" was signed by ${parsed.data.client_signature_name}`,
    metadata: {
      agreement_id: parsed.data.agreement_id,
      signed_by: parsed.data.client_signature_name,
    },
  })

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  revalidatePath(`/agreements/${parsed.data.agreement_id}`)
  return { data, error: null }
}

// ============================================================
// firmSignAgreement (records firm's own counter-signature)
// ============================================================

export async function firmSignAgreement(
  raw: FirmSignAgreementInput
): Promise<{ data: Agreement | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = firmSignAgreementSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('status, client_id, title')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  const { data, error } = await supabase
    .from('agreements')
    .update({
      firm_signed_at: new Date().toISOString(),
      firm_signer: user.id,
    })
    .eq('id', parsed.data.agreement_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_firm_signed',
    description: `Agreement "${existing.title}" was counter-signed by the firm`,
    metadata: { agreement_id: parsed.data.agreement_id },
  })

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  revalidatePath(`/agreements/${parsed.data.agreement_id}`)
  return { data, error: null }
}

// ============================================================
// deleteAgreement (admin only)
// ============================================================

export async function deleteAgreement(
  agreementId: string
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!staff || !['owner', 'admin'].includes(staff.role)) {
    return { data: null, error: 'Only admins can delete agreements' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('client_id, title, status')
    .eq('id', agreementId)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  if (existing.status === 'signed') {
    return { data: null, error: 'Cannot delete a signed agreement' }
  }

  const { error } = await supabase
    .from('agreements')
    .delete()
    .eq('id', agreementId)

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_deleted',
    description: `Agreement "${existing.title}" was deleted`,
    metadata: { agreement_id: agreementId },
  })

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  return { data: null, error: null }
}
