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
import { sendEmail, emailTemplates } from '@/lib/email'
import { generateAgreementPdf } from '@/lib/pdf'

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
    .select('*')
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

  const shouldCreateNewVersion = existing.status === 'signed' && existing.change_requested === true

  if (shouldCreateNewVersion) {
    const nextVersion = (existing.version ?? 1) + 1
    const parentId = existing.parent_id ?? existing.id

    const { data, error } = await supabase
      .from('agreements')
      .insert({
        client_id: existing.client_id,
        project_id: parsed.data.project_id ?? existing.project_id,
        title: parsed.data.title ?? existing.title,
        content: parsed.data.content ?? existing.content,
        template_used: parsed.data.template_used ?? existing.template_used,
        expires_at: parsed.data.expires_at ?? existing.expires_at,
        status: 'sent',
        version: nextVersion,
        parent_id: parentId,
        created_by: user.id,
        change_requested: false,
        change_reason: null,
        signed_at: null,
        client_signature_name: null,
        firm_signed_at: null,
        firm_signer: null,
        sent_at: null,
        viewed_at: null,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) return { data: null, error: error.message }

    await logActivity(supabase, {
      client_id: existing.client_id,
      actor_id: user.id,
      event_type: 'agreement_version_created',
      description: `New version of agreement "${existing.title}" was created`,
      metadata: { agreement_id: data.id, parent_agreement_id: agreementId, version: nextVersion },
    })

    revalidatePath(`/clients/${existing.client_id}`)
    revalidatePath('/agreements')
    revalidatePath(`/agreements/${agreementId}`)
    revalidatePath(`/agreements/${data.id}`)
    return { data, error: null }
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
): Promise<{ data: { changeRequestId: string } | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const userType = user.user_metadata?.user_type
  if (!userType || !['client', 'staff'].includes(userType)) {
    return { data: null, error: 'Unauthorized user type' }
  }

  const parsed = requestAgreementChangesSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agreements')
    .select('status, client_id, title, clients(company_name)')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  // Check authorization
  if (userType === 'client' && user.user_metadata?.client_id !== existing.client_id) {
    return { data: null, error: 'Unauthorized' }
  }
  if (userType === 'staff') {
    // Staff can request changes on any agreement
  }

  if (!['sent', 'viewed', 'signed'].includes(existing.status)) {
    return { data: null, error: 'You can only request changes on sent or signed agreements' }
  }

  // Insert change request
  const { data: changeRequest, error: insertError } = await supabase
    .from('agreement_change_requests')
    .insert({
      agreement_id: parsed.data.agreement_id,
      requested_by: user.id,
      requested_by_type: userType,
      change_reason: parsed.data.change_reason,
    })
    .select('id')
    .single()

  if (insertError) return { data: null, error: insertError.message }

  // Update agreement to mark as having pending changes
  const { error: updateError } = await supabase
    .from('agreements')
    .update({ change_requested: true })
    .eq('id', parsed.data.agreement_id)

  if (updateError) return { data: null, error: updateError.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'agreement_change_requested',
    description: `${userType === 'client' ? 'Client' : 'Staff'} requested changes for agreement "${existing.title}"`,
    metadata: { agreement_id: parsed.data.agreement_id, change_request_id: changeRequest.id },
  })

  // Send email to admins/project managers
  const { data: staffMembers } = await supabase
    .from('staff')
    .select('email, full_name, role')
    .in('role', ['admin', 'owner', 'project_manager'])
    .eq('is_active', true)

  if (staffMembers && staffMembers.length > 0) {
    const clientName = (existing as any).clients?.company_name || 'A client'
    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agreements/${parsed.data.agreement_id}`

    // Send emails in parallel instead of sequentially
    await Promise.all(
      staffMembers
        .filter(staff => staff.email)
        .map(staff => {
          const emailContent = emailTemplates.agreementChangeRequested({
            staffName: staff.full_name || 'Team Member',
            clientName,
            agreementTitle: existing.title,
            changeReason: parsed.data.change_reason,
            adminPortalUrl: adminUrl,
          })
          return sendEmail({
            to: staff.email!,
            ...emailContent,
          })
        })
    )
  }

  revalidatePath(`/clients/${existing.client_id}`)
  revalidatePath('/agreements')
  revalidatePath(`/portal/agreements/${parsed.data.agreement_id}`)

  return { data: { changeRequestId: changeRequest.id }, error: null }
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
    .select('status, client_id, title, expires_at, clients(contact_email, company_name)')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  if (existing.status === 'signed') {
    return { data: null, error: 'Agreement is already signed' }
  }

  // Get client email for sending notification
  const clientEmail = existing.clients?.contact_email
  const clientName = existing.clients?.company_name || 'Valued Client'

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

  // Send email notification to client
  if (clientEmail) {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/agreements/${parsed.data.agreement_id}`
    const emailContent = emailTemplates.agreementSent({
      clientName,
      agreementTitle: existing.title,
      portalUrl,
      expiresAt: data.expires_at || undefined,
    })

    await sendEmail({
      to: clientEmail,
      ...emailContent,
    })
  }

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
    .select('status, client_id, title, clients(contact_email, company_name)')
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

  // Get client email for sending notification
  const clientEmail = existing.clients?.contact_email
  const clientName = existing.clients?.company_name || 'Valued Client'

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

  // Send email confirmation to client
  if (clientEmail && data.signed_at) {
    const emailContent = emailTemplates.agreementSigned({
      clientName,
      agreementTitle: existing.title,
      signedAt: data.signed_at,
    })

    await sendEmail({
      to: clientEmail,
      ...emailContent,
    })
  }

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
    .select('status, client_id, title, content, signed_at, client_signature_name, pdf_storage_path, version, parent_id, clients(contact_email, company_name)')
    .eq('id', parsed.data.agreement_id)
    .single()

  if (fetchError || !existing) return { data: null, error: 'Agreement not found' }

  if (existing.status !== 'signed') {
    return { data: null, error: 'Agreement must be signed by the client before the firm can counter-sign' }
  }

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

  // Send signed agreement PDF to the client once both signatures are complete
  const clientEmail = (existing.clients as any)?.contact_email
  const clientName = (existing.clients as any)?.company_name || 'Valued Client'

  if (clientEmail) {
    const pdf = await generateAgreementPdf({
      title: existing.title,
      clientName,
      content: existing.content as string,
      version: existing.version,
      signedAt: existing.signed_at,
      firmSignedAt: data.firm_signed_at,
      clientSignatureName: existing.client_signature_name,
      firmSigner: user.id,
    })

    const emailContent = emailTemplates.agreementSigned({
      clientName,
      agreementTitle: existing.title,
      signedAt: data.firm_signed_at || new Date().toISOString(),
    })

    await sendEmail({
      to: clientEmail,
      ...emailContent,
      attachments: [
        {
          filename: `agreement-${existing.version}.pdf`,
          type: 'application/pdf',
          data: pdf.toString('base64'),
        },
      ],
    })
  }

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
