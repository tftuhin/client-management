import { z } from 'zod'

// ============================================================
// Offer status enum
// ============================================================

export const offerStatusSchema = z.enum(['draft', 'proposed', 'accepted', 'declined'])

// ============================================================
// Create offer schema
// ============================================================

export const createOfferSchema = z.object({
  client_id: z.string().uuid('Must be a valid client ID'),

  title: z
    .string()
    .min(1, 'Offer title is required')
    .max(300, 'Title must be 300 characters or fewer'),

  service_type: z
    .string()
    .min(1, 'Service type is required')
    .max(100, 'Service type must be 100 characters or fewer'),

  description: z
    .string()
    .max(3000, 'Description must be 3000 characters or fewer')
    .optional()
    .or(z.literal('')),

  estimated_value: z.coerce
    .number()
    .min(0, 'Estimated value must be 0 or greater')
    .max(100_000_000, 'Estimated value is too large')
    .nullable()
    .optional(),

  follow_up_date: z
    .string()
    .date('Must be a valid date (YYYY-MM-DD)')
    .nullable()
    .optional(),
})

// ============================================================
// Update offer schema
// ============================================================

export const updateOfferSchema = createOfferSchema
  .partial()
  .omit({ client_id: true })
  .extend({
    status: offerStatusSchema.optional(),
    proposed_at: z
      .string()
      .datetime({ offset: true, message: 'Must be a valid datetime' })
      .nullable()
      .optional(),
    responded_at: z
      .string()
      .datetime({ offset: true, message: 'Must be a valid datetime' })
      .nullable()
      .optional(),
  })

// ============================================================
// Propose offer schema
// ============================================================

export const proposeOfferSchema = z.object({
  offer_id: z.string().uuid('Must be a valid offer ID'),
  follow_up_date: z
    .string()
    .date('Must be a valid date (YYYY-MM-DD)')
    .nullable()
    .optional(),
})

// ============================================================
// Respond to offer schema
// ============================================================

export const respondToOfferSchema = z.object({
  offer_id: z.string().uuid('Must be a valid offer ID'),
  response: z.enum(['accepted', 'declined'], {
    required_error: 'Response must be accepted or declined',
  }),
})

// ============================================================
// Types
// ============================================================

export type CreateOfferInput = z.infer<typeof createOfferSchema>
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>
export type ProposeOfferInput = z.infer<typeof proposeOfferSchema>
export type RespondToOfferInput = z.infer<typeof respondToOfferSchema>
