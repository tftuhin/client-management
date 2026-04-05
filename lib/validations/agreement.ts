import { z } from 'zod'

// ============================================================
// Agreement status enum
// ============================================================

export const agreementStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'signed',
  'expired',
  'cancelled',
])

// ============================================================
// Create agreement schema
// ============================================================

export const createAgreementSchema = z.object({
  client_id: z.string().uuid('Must be a valid client ID'),

  project_id: z.string().uuid().nullable().optional(),

  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title must be 300 characters or fewer'),

  content: z.string().min(1, 'Agreement content is required'),

  template_used: z.union([
    z.literal(''),
    z.null(),
    z.string().uuid('Must be a valid template ID')
  ]).transform(val => val === '' ? null : val),

  expires_at: z.string().optional().nullable(),
})

// ============================================================
// Update agreement schema
// ============================================================

export const updateAgreementSchema = createAgreementSchema
  .partial()
  .omit({ client_id: true })
  .extend({
    status: agreementStatusSchema.optional(),
    pdf_storage_path: z.string().nullable().optional(),
    change_requested: z.boolean().optional(),
    change_reason: z.string().optional(),
  })

export const requestAgreementChangesSchema = z.object({
  agreement_id: z.string().uuid('Must be a valid agreement ID'),
  change_reason: z.string().min(1, 'Please describe the changes you want to make').max(1000),
})

// ============================================================
// Send agreement schema
// ============================================================

export const sendAgreementSchema = z.object({
  agreement_id: z.string().uuid('Must be a valid agreement ID'),
  expires_at: z.string().optional().nullable(),
})

// ============================================================
// Sign agreement schema (client portal / internal sign-off)
// ============================================================

export const signAgreementSchema = z.object({
  agreement_id: z.string().uuid('Must be a valid agreement ID'),
  client_signature_name: z
    .string()
    .min(1, 'Signature name is required')
    .max(200, 'Signature name must be 200 characters or fewer'),
})

// ============================================================
// Firm sign-off schema
// ============================================================

export const firmSignAgreementSchema = z.object({
  agreement_id: z.string().uuid('Must be a valid agreement ID'),
})

// ============================================================
// Agreement template schemas
// ============================================================

export const createAgreementTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(200, 'Template name must be 200 characters or fewer'),

  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),

  content: z.string().min(1, 'Template content is required'),

  is_default: z.boolean().default(false),
})

export const updateAgreementTemplateSchema = createAgreementTemplateSchema.partial()

// ============================================================
// Types
// ============================================================

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>
export type UpdateAgreementInput = z.infer<typeof updateAgreementSchema>
export type SendAgreementInput = z.infer<typeof sendAgreementSchema>
export type SignAgreementInput = z.infer<typeof signAgreementSchema>
export type FirmSignAgreementInput = z.infer<typeof firmSignAgreementSchema>
export type RequestAgreementChangesInput = z.infer<typeof requestAgreementChangesSchema>
export type CreateAgreementTemplateInput = z.infer<typeof createAgreementTemplateSchema>
export type UpdateAgreementTemplateInput = z.infer<typeof updateAgreementTemplateSchema>
