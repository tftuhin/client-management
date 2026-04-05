-- ============================================================
-- Migration 003: Add source and invoice_type to invoices
-- Run this in your Supabase SQL editor
-- ============================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS source text
    CHECK (source IN ('upwork', 'paddle', 'direct', 'other')),
  ADD COLUMN IF NOT EXISTS invoice_type text
    CHECK (invoice_type IN ('one_time', 'recurring'));

-- Index for dashboard queries grouped by source
CREATE INDEX IF NOT EXISTS invoices_source_idx ON invoices (source);
CREATE INDEX IF NOT EXISTS invoices_type_idx ON invoices (invoice_type);
