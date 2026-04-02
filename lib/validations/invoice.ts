import { z } from 'zod'

// ============================================================
// Invoice status enum
// ============================================================

export const invoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
])

// ============================================================
// Line item schema
// ============================================================

export const lineItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or fewer'),

  quantity: z.coerce
    .number()
    .positive('Quantity must be greater than zero')
    .max(1_000_000, 'Quantity is too large'),

  unit_price: z.coerce
    .number()
    .min(0, 'Unit price must be zero or greater')
    .max(100_000_000, 'Unit price is too large'),

  sort_order: z.coerce.number().int().min(0).default(0),
})

export const createLineItemSchema = lineItemSchema.extend({
  invoice_id: z.string().uuid('Must be a valid invoice ID'),
})

export const updateLineItemSchema = lineItemSchema.partial().extend({
  id: z.string().uuid('Must be a valid line item ID'),
})

// ============================================================
// Invoice schema
// ============================================================

export const createInvoiceSchema = z.object({
  client_id: z.string().uuid('Must be a valid client ID'),

  title: z
    .string()
    .min(1, 'Invoice title is required')
    .max(300, 'Title must be 300 characters or fewer'),

  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .default('USD'),

  discount_pct: z.coerce
    .number()
    .min(0, 'Discount must be 0 or greater')
    .max(100, 'Discount cannot exceed 100%')
    .default(0),

  discount_flat: z.coerce
    .number()
    .min(0, 'Flat discount must be 0 or greater')
    .max(100_000_000, 'Flat discount is too large')
    .default(0),

  tax_pct: z.coerce
    .number()
    .min(0, 'Tax must be 0 or greater')
    .max(100, 'Tax cannot exceed 100%')
    .default(0),

  issue_date: z.string().date('Must be a valid date (YYYY-MM-DD)'),

  due_date: z.string().date('Must be a valid date (YYYY-MM-DD)'),

  notes: z
    .string()
    .max(3000, 'Notes must be 3000 characters or fewer')
    .optional()
    .or(z.literal('')),

  payment_terms: z
    .string()
    .max(200, 'Payment terms must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),

  // Optionally include line items at creation time
  line_items: z.array(lineItemSchema).min(0).default([]),
}).refine(
  (data) => {
    const issue = new Date(data.issue_date)
    const due = new Date(data.due_date)
    return due >= issue
  },
  { message: 'Due date must be on or after the issue date', path: ['due_date'] }
)

export const updateInvoiceSchema = z.object({
  title: z
    .string()
    .min(1, 'Invoice title is required')
    .max(300, 'Title must be 300 characters or fewer')
    .optional(),

  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .optional(),

  discount_pct: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional(),

  discount_flat: z.coerce
    .number()
    .min(0)
    .optional(),

  tax_pct: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional(),

  issue_date: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),

  due_date: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),

  notes: z.string().max(3000).optional().or(z.literal('')),

  payment_terms: z.string().max(200).optional().or(z.literal('')),

  status: invoiceStatusSchema.optional(),

  pdf_storage_path: z.string().nullable().optional(),
})

// ============================================================
// Payment schema
// ============================================================

export const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid('Must be a valid invoice ID'),

  amount: z.coerce
    .number()
    .positive('Payment amount must be greater than zero')
    .max(100_000_000, 'Payment amount is too large'),

  paid_at: z
    .string()
    .datetime({ offset: true, message: 'Must be a valid datetime' })
    .optional(),

  method: z
    .enum(['bank_transfer', 'credit_card', 'paypal', 'stripe', 'cash', 'cheque', 'crypto', 'other'])
    .optional(),

  reference: z
    .string()
    .max(200, 'Reference must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),

  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional()
    .or(z.literal('')),
})

// ============================================================
// Types
// ============================================================

export type LineItemInput = z.infer<typeof lineItemSchema>
export type CreateLineItemInput = z.infer<typeof createLineItemSchema>
export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
