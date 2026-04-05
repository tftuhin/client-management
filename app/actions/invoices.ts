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

  const parsed = createInvoiceSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { line_items, ...invoiceData } = parsed.data

  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...invoiceData, created_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

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

  const { data, error } = await supabase
    .from('invoices')
    .update(parsed.data)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/invoices')
  revalidatePath(`/clients/${data.client_id}`)
  return { data, error: null }
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

  const { error } = await supabase.from('invoice_payments').insert({
    ...parsed.data,
    recorded_by: user.id,
  })

  if (error) return { data: null, error: error.message }

  // Get invoice for activity log
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, client_id')
    .eq('id', parsed.data.invoice_id)
    .single()

  if (invoice) {
    await logActivity(supabase, {
      client_id: invoice.client_id,
      actor_id: user.id,
      event_type: 'payment_recorded',
      description: `Payment of ${parsed.data.amount} recorded for "${invoice.invoice_number}"`,
      metadata: { invoice_id: parsed.data.invoice_id, amount: parsed.data.amount },
    })
  }

  revalidatePath('/invoices')
  if (invoice) revalidatePath(`/clients/${invoice.client_id}`)
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
