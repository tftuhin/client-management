import { z } from 'zod'

// ============================================================
// Pipeline stage enum
// ============================================================

export const pipelineStageSchema = z.enum([
  'lead',
  'prospect',
  'proposal_sent',
  'negotiation',
  'active',
  'on_hold',
  'completed',
  'churned',
])

// ============================================================
// Client schema
// ============================================================

export const createClientSchema = z.object({
  company_name: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or fewer'),

  contact_name: z
    .string()
    .min(1, 'Contact name is required')
    .max(200, 'Contact name must be 200 characters or fewer'),

  contact_email: z
    .string()
    .min(1, 'Contact email is required')
    .email('Must be a valid email address'),

  contact_phone: z
    .string()
    .max(50, 'Phone must be 50 characters or fewer')
    .optional()
    .or(z.literal('')),

  website_url: z
    .string()
    .url('Must be a valid URL (include https://)')
    .max(500, 'URL must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),

  industry: z
    .string()
    .max(100, 'Industry must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),

  company_size: z
    .enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
    .optional()
    .or(z.literal('')),

  annual_revenue: z
    .string()
    .max(100, 'Annual revenue must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),

  country: z
    .string()
    .max(100, 'Country must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(500, 'Address must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),

  pipeline_stage: pipelineStageSchema.default('lead'),

  pipeline_order: z.coerce.number().int().min(0).default(0),

  assigned_to: z.string().uuid('Must be a valid staff ID').nullable().optional(),

  lead_source: z
    .string()
    .max(100, 'Lead source must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),

  tags: z.array(z.string().max(50)).default([]),

  notes: z
    .string()
    .max(5000, 'Notes must be 5000 characters or fewer')
    .optional()
    .or(z.literal('')),
})

export const updateClientSchema = createClientSchema.partial().extend({
  is_archived: z.boolean().optional(),
})

export const updateClientStageSchema = z.object({
  pipeline_stage: pipelineStageSchema,
  pipeline_order: z.coerce.number().int().min(0).optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type UpdateClientStageInput = z.infer<typeof updateClientStageSchema>

// ============================================================
// Project requirements schema
// ============================================================

const projectRequirementsBaseSchema = z.object({
  client_id: z.string().uuid('Must be a valid client ID'),

  project_name: z
    .string()
    .min(1, 'Project name is required')
    .max(300, 'Project name must be 300 characters or fewer'),

  project_type: z
    .enum([
      'website',
      'web_app',
      'e_commerce',
      'mobile_app',
      'api',
      'redesign',
      'maintenance',
      'other',
    ])
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or fewer')
    .optional()
    .or(z.literal('')),

  budget_min: z.coerce
    .number()
    .min(0, 'Budget must be a positive number')
    .max(100_000_000, 'Budget is too large')
    .nullable()
    .optional(),

  budget_max: z.coerce
    .number()
    .min(0, 'Budget must be a positive number')
    .max(100_000_000, 'Budget is too large')
    .nullable()
    .optional(),

  timeline_weeks: z.coerce
    .number()
    .int()
    .min(1, 'Timeline must be at least 1 week')
    .max(520, 'Timeline must be 520 weeks or fewer')
    .nullable()
    .optional(),

  deadline: z.string().date('Must be a valid date (YYYY-MM-DD)').nullable().optional(),

  tech_preferences: z.array(z.string().max(100)).default([]),

  priority_features: z.array(z.string().max(200)).default([]),

  competitors: z.array(z.string().max(200)).default([]),

  target_audience: z
    .string()
    .max(1000, 'Target audience must be 1000 characters or fewer')
    .optional()
    .or(z.literal('')),

  special_notes: z
    .string()
    .max(3000, 'Special notes must be 3000 characters or fewer')
    .optional()
    .or(z.literal('')),

  is_current: z.boolean().default(true),
})

export const createProjectRequirementsSchema = projectRequirementsBaseSchema.refine(
  (data) => {
    if (data.budget_min != null && data.budget_max != null) {
      return data.budget_max >= data.budget_min
    }
    return true
  },
  { message: 'Maximum budget must be greater than or equal to minimum budget', path: ['budget_max'] }
)

export const updateProjectRequirementsSchema = projectRequirementsBaseSchema.partial().omit({ client_id: true })

export type CreateProjectRequirementsInput = z.infer<typeof createProjectRequirementsSchema>
export type UpdateProjectRequirementsInput = z.infer<typeof updateProjectRequirementsSchema>
