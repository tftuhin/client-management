'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateFirmSettingsSchema = z.object({
  firm_name: z.string().min(1).max(200).optional(),
  firm_email: z.string().email().optional().or(z.literal('')),
  firm_phone: z.string().max(50).optional().or(z.literal('')),
  firm_address: z.string().max(500).optional().or(z.literal('')),
  firm_logo_url: z.string().url().optional().or(z.literal('')),
  default_currency: z.string().length(3).optional(),
  default_tax_pct: z.coerce.number().min(0).max(100).optional(),
  default_payment_terms: z.string().max(200).optional().or(z.literal('')),
  invoice_prefix: z.string().max(10).optional(),
  invoice_footer: z.string().max(1000).optional().or(z.literal('')),
})

export type UpdateFirmSettingsInput = z.infer<typeof updateFirmSettingsSchema>

export async function updateFirmSettings(
  raw: UpdateFirmSettingsInput
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: staffRow } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!staffRow || staffRow.role !== 'owner') {
    return { data: null, error: 'Only the owner can update firm settings' }
  }

  const parsed = updateFirmSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { error } = await supabase
    .from('firm_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { data: null, error: error.message }

  revalidatePath('/settings')
  return { data: null, error: null }
}

const updateStaffSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export async function updateStaffProfile(
  raw: z.infer<typeof updateStaffSchema>
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateStaffSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
  }

  const { error } = await supabase
    .from('staff')
    .update(parsed.data)
    .eq('id', user.id)

  if (error) return { data: null, error: error.message }

  revalidatePath('/settings')
  return { data: null, error: null }
}

export async function updateStaffRole(
  staffId: string,
  role: 'admin' | 'member'
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
    return { data: null, error: 'Only admins can change roles' }
  }

  const { error } = await supabase
    .from('staff')
    .update({ role })
    .eq('id', staffId)

  if (error) return { data: null, error: error.message }

  revalidatePath('/settings')
  return { data: null, error: null }
}
