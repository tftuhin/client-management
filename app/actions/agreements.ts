'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createAgreementSchema,
  updateAgreementSchema,
  sendAgreementSchema,
  signAgreementSchema,
  firmSignAgreementSchema,
  type CreateAgreementInput,
  type UpdateAgreementInput,
  type SendAgreementInput,
  type SignAgreementInput,
  type FirmSignAgreementInput,
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

  const { data, error } = await supabase
    .from('agreements')
    .insert({
      ...parsed.data,
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

  revalidatePath(`/dashboard/clients/${parsed.data.client_id}`)
  revalidatePath('/dashboard/agreements')
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

  const { data, error } = await supabase
    .from('agreements')
    .update(parsed.data)
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

  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  revalidatePath('/dashboard/agreements')
  revalidatePath(`/dashboard/agreements/${agreementId}`)
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

  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  revalidatePath('/dashboard/agreements')
  revalidatePath(`/dashboard/agreements/${parsed.data.agreement_id}`)
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

  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  revalidatePath('/dashboard/agreements')
  revalidatePath(`/dashboard/agreements/${parsed.data.agreement_id}`)
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

  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  revalidatePath('/dashboard/agreements')
  revalidatePath(`/dashboard/agreements/${parsed.data.agreement_id}`)
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

  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  revalidatePath('/dashboard/agreements')
  return { data: null, error: null }
}
