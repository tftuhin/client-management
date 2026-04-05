'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@/lib/validations/project'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

export async function createProjectAction(
  raw: CreateProjectInput
): Promise<{ data: Project | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/projects')
  revalidatePath(`/clients/${parsed.data.client_id}`)
  return { data, error: null }
}

export async function updateProjectAction(
  projectId: string,
  raw: UpdateProjectInput
): Promise<{ data: Project | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Enforce agreement gate: can only set status to 'active' if there's a signed agreement
  if (raw.status === 'active') {
    const { data: project } = await supabase
      .from('projects')
      .select('agreement_id')
      .eq('id', projectId)
      .single()

    const agreementId = raw.agreement_id ?? project?.agreement_id
    if (!agreementId) {
      return { data: null, error: 'A signed agreement is required before activating a project' }
    }

    const { data: agreement } = await supabase
      .from('agreements')
      .select('status')
      .eq('id', agreementId)
      .single()

    if (agreement?.status !== 'signed') {
      return { data: null, error: 'The linked agreement must be signed before activating this project' }
    }
  }

  const parsed = updateProjectSchema.safeParse(raw)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }

  const { data, error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', projectId)
    .select('*, clients(company_name)')
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  if ((data as any)?.client_id) revalidatePath(`/clients/${(data as any).client_id}`)
  return { data, error: null }
}

export async function deleteProjectAction(
  projectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: project } = await supabase
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single()

  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) return { error: error.message }

  revalidatePath('/projects')
  if (project?.client_id) revalidatePath(`/clients/${project.client_id}`)
  return { error: null }
}
