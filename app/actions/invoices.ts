'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type RecordPaymentInput,
} from '@/lib/validations/invoice'
import type { Database } from '@/types/database'
import { sendEmail, emailTemplates } from '@/lib/email'

type Invoice = Database['public']['Tables']['invoices']['Row']

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

export async function createInvoice(
  raw: CreateInvoiceInput
): Promise<{ data: Invoice | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Check if user is staff
  const { data: staffCheck } = await supabase
    .from('staff')
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  if (!staffCheck) return { data: null, error: 'Only staff members can create invoices' }

  const parsed = createInvoiceSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { line_items, ...invoiceData } = parsed.data

  let result = await supabase
    .from('invoices')
    .insert({ ...invoiceData, created_by: user.id })
    .select(`
      *,
      clients(contact_email, company_name)
    `)
    .single()

  if (result.error && /invoice_type.*does not exist|Could not find the 'invoice_type' column/i.test(result.error.message)) {
    const { invoice_type, ...fallbackData } = invoiceData
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...fallbackData, created_by: user.id })
      .select(`
        *,
        clients(contact_email, company_name)
      `)
      .single()

    if (error) return { data: null, error: error.message }
    result = { data, error: null }
  }

  if (result.error) return { data: null, error: result.error.message }

  const data = result.data

  // Insert line items if provided
  if (line_items && line_items.length > 0) {
    await supabase.from('invoice_line_items').insert(
      line_items.map((item, idx) => ({
        invoice_id: data.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: item.sort_order ?? idx,
      }))
    )
  }

  await logActivity(supabase, {
    client_id: data.client_id,
    actor_id: user.id,
    event_type: 'invoice_created',
    description: `Invoice "${data.invoice_number}" was created`,
    metadata: { invoice_id: data.id },
  })

  // Send email notification to client
  const clientEmail = data.clients?.contact_email
  if (clientEmail) {
    const clientName = data.clients?.company_name || 'Valued Client'
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${data.id}`

    const emailContent = emailTemplates.invoiceGenerated({
      clientName,
      invoiceNumber: data.invoice_number || 'N/A',
      amount: `$${data.total_amount?.toFixed(2) || '0.00'}`,
      dueDate: data.due_date || new Date().toISOString(),
      portalUrl,
    })

    await sendEmail({
      to: clientEmail,
      ...emailContent,
    })
  }

  revalidatePath('/invoices')
  revalidatePath(`/clients/${data.client_id}`)
  return { data, error: null }
}

export async function updateInvoice(
  invoiceId: string,
  raw: UpdateInvoiceInput
): Promise<{ data: Invoice | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateInvoiceSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  let result = await supabase
    .from('invoices')
    .update(parsed.data)
    .eq('id', invoiceId)
    .select()
    .single()

  if (result.error && /invoice_type.*does not exist|Could not find the 'invoice_type' column/i.test(result.error.message)) {
    const { invoice_type, ...fallbackData } = parsed.data
    const { data, error } = await supabase
      .from('invoices')
      .update(fallbackData)
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    result = { data, error: null }
  }

  if (result.error) return { data: null, error: result.error.message }

  revalidatePath('/invoices')
  revalidatePath(`/clients/${result.data.client_id}`)
  return { data: result.data, error: null }
}

export async function sendInvoice(
  invoiceId: string
): Promise<{ data: Invoice | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: existing } = await supabase
    .from('invoices')
    .select('status, invoice_number, client_id')
    .eq('id', invoiceId)
    .single()

  if (!existing) return { data: null, error: 'Invoice not found' }
  if (!['draft', 'viewed'].includes(existing.status)) {
    return { data: null, error: 'Only draft invoices can be sent' }
  }

  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: existing.client_id,
    actor_id: user.id,
    event_type: 'invoice_sent',
    description: `Invoice "${existing.invoice_number}" was sent`,
    metadata: { invoice_id: invoiceId },
  })

  revalidatePath('/invoices')
  revalidatePath(`/clients/${existing.client_id}`)
  return { data, error: null }
}

export async function recordPayment(
  raw: RecordPaymentInput
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = recordPaymentSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { error: paymentError } = await supabase.from('invoice_payments').insert({
    ...parsed.data,
    recorded_by: user.id,
  })

  if (paymentError) return { data: null, error: paymentError.message }

  const { data: invoice, error: invoiceFetchError } = await supabase
    .from('invoices')
    .select('invoice_number, total, amount_paid, status, paid_at, client_id, currency')
    .eq('id', parsed.data.invoice_id)
    .single()

  if (invoice && !invoiceFetchError) {
    const existingPaid = invoice.amount_paid ?? 0
    const updatedPaid = existingPaid + parsed.data.amount
    const isFullyPaid = updatedPaid >= invoice.total
    const updatedStatus = isFullyPaid ? 'paid' : updatedPaid > 0 ? 'partially_paid' : invoice.status
    const updatedPaidAt = isFullyPaid ? (parsed.data.paid_at ?? new Date().toISOString()) : invoice.paid_at

    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({
        amount_paid: updatedPaid,
        status: updatedStatus,
        paid_at: updatedPaidAt,
      })
      .eq('id', parsed.data.invoice_id)

    if (updateInvoiceError) {
      return { data: null, error: updateInvoiceError.message }
    }

    await logActivity(supabase, {
      client_id: invoice.client_id,
      actor_id: user.id,
      event_type: 'payment_recorded',
      description: `Payment of ${parsed.data.amount} recorded for "${invoice.invoice_number}"`,
      metadata: { invoice_id: parsed.data.invoice_id, amount: parsed.data.amount },
    })

    revalidatePath('/invoices')
    revalidatePath(`/clients/${invoice.client_id}`)
    return { data: null, error: null }
  }

  revalidatePath('/invoices')
  return { data: null, error: null }
}

export async function deleteInvoice(
  invoiceId: string
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: staffRow } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!staffRow || !['owner', 'admin'].includes(staffRow.role)) {
    return { data: null, error: 'Only admins can delete invoices' }
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('status, invoice_number, client_id')
    .eq('id', invoiceId)
    .single()

  if (invoice && ['sent', 'paid', 'partially_paid'].includes(invoice.status)) {
    return { data: null, error: 'Cannot delete a sent or paid invoice' }
  }

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) return { data: null, error: error.message }

  revalidatePath('/invoices')
  if (invoice) revalidatePath(`/clients/${invoice.client_id}`)
  return { data: null, error: null }
}
