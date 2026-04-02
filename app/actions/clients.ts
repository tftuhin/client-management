'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createClientSchema,
  updateClientSchema,
  updateClientStageSchema,
  createProjectRequirementsSchema,
  updateProjectRequirementsSchema,
  type CreateClientInput,
  type UpdateClientInput,
  type UpdateClientStageInput,
  type CreateProjectRequirementsInput,
  type UpdateProjectRequirementsInput,
} from '@/lib/validations/client'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']
type ProjectRequirements = Database['public']['Tables']['project_requirements']['Row']

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
// createClient
// ============================================================

export async function createClientAction(
  raw: CreateClientInput
): Promise<{ data: Client | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = createClientSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: data.id,
    actor_id: user.id,
    event_type: 'client_created',
    description: `New client "${data.company_name}" was added`,
    metadata: { client_id: data.id, pipeline_stage: data.pipeline_stage },
  })

  revalidatePath('/dashboard/clients')
  return { data, error: null }
}

// ============================================================
// updateClient
// ============================================================

export async function updateClientAction(
  clientId: string,
  raw: UpdateClientInput
): Promise<{ data: Client | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateClientSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('clients')
    .update(parsed.data)
    .eq('id', clientId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: clientId,
    actor_id: user.id,
    event_type: 'client_updated',
    description: `Client "${data.company_name}" details were updated`,
    metadata: { client_id: clientId },
  })

  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data, error: null }
}

// ============================================================
// archiveClient
// ============================================================

export async function archiveClientAction(
  clientId: string,
  archive = true
): Promise<{ data: Client | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('clients')
    .update({ is_archived: archive })
    .eq('id', clientId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: clientId,
    actor_id: user.id,
    event_type: archive ? 'client_archived' : 'client_unarchived',
    description: `Client "${data.company_name}" was ${archive ? 'archived' : 'unarchived'}`,
    metadata: { client_id: clientId },
  })

  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data, error: null }
}

// ============================================================
// updateClientStage
// ============================================================

export async function updateClientStageAction(
  clientId: string,
  raw: UpdateClientStageInput
): Promise<{ data: Client | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateClientStageSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('clients')
    .update(parsed.data)
    .eq('id', clientId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // Pipeline change is logged automatically by the DB trigger (log_pipeline_change)
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data, error: null }
}

// ============================================================
// deleteClient (hard delete — admin only)
// ============================================================

export async function deleteClientAction(
  clientId: string
): Promise<{ data: null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Verify admin role
  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (staffError || !staffRow) return { data: null, error: 'Could not verify permissions' }
  if (!['owner', 'admin'].includes(staffRow.role)) {
    return { data: null, error: 'Only admins can permanently delete clients' }
  }

  // Get client name for logging before deletion
  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: null,
    actor_id: user.id,
    event_type: 'client_deleted',
    description: `Client "${client?.company_name ?? clientId}" was permanently deleted`,
    metadata: { client_id: clientId },
  })

  revalidatePath('/dashboard/clients')
  return { data: null, error: null }
}

// ============================================================
// createProjectRequirements
// ============================================================

export async function createProjectRequirementsAction(
  raw: CreateProjectRequirementsInput
): Promise<{ data: ProjectRequirements | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = createProjectRequirementsSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  // Mark any existing current requirements as not current
  if (parsed.data.is_current) {
    await supabase
      .from('project_requirements')
      .update({ is_current: false })
      .eq('client_id', parsed.data.client_id)
      .eq('is_current', true)
  }

  const { data, error } = await supabase
    .from('project_requirements')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: parsed.data.client_id,
    actor_id: user.id,
    event_type: 'project_requirements_added',
    description: `Project requirements "${data.project_name}" were added`,
    metadata: { requirements_id: data.id },
  })

  revalidatePath(`/dashboard/clients/${parsed.data.client_id}`)
  return { data, error: null }
}

// ============================================================
// updateProjectRequirements
// ============================================================

export async function updateProjectRequirementsAction(
  requirementsId: string,
  clientId: string,
  raw: UpdateProjectRequirementsInput
): Promise<{ data: ProjectRequirements | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = updateProjectRequirementsSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { data, error } = await supabase
    .from('project_requirements')
    .update(parsed.data)
    .eq('id', requirementsId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  await logActivity(supabase, {
    client_id: clientId,
    actor_id: user.id,
    event_type: 'project_requirements_updated',
    description: `Project requirements "${data.project_name}" were updated`,
    metadata: { requirements_id: requirementsId },
  })

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data, error: null }
}
