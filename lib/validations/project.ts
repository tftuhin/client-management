import { z } from 'zod'

export const projectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])

export const createProjectSchema = z.object({
  client_id: z.string().uuid('Must be a valid client ID'),
  name: z.string().min(1, 'Project name is required').max(300),
  description: z.string().max(5000).optional().or(z.literal('')),
  assigned_to: z.string().uuid().nullable().optional(),
  platform: z.enum(['upwork', 'outside']).nullable().optional(),
})

export const updateProjectSchema = createProjectSchema.partial().omit({ client_id: true }).extend({
  status: projectStatusSchema.optional(),
  agreement_id: z.string().uuid().nullable().optional(),
  platform: z.enum(['upwork', 'outside']).nullable().optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
