-- ============================================================
-- Migration 007: Fix invoice number trigger + ensure firm_settings row
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Ensure a default firm_settings row exists (required for invoice numbering)
INSERT INTO firm_settings (firm_name, invoice_prefix, invoice_next_num, default_currency, default_tax_pct)
SELECT 'My Web Firm', 'INV', 1, 'USD', 0
WHERE NOT EXISTS (SELECT 1 FROM firm_settings);

-- 2. Fix generate_invoice_number to use a WHERE clause (prevents PostgREST error)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id          UUID;
  v_prefix      TEXT;
  v_next_num    INTEGER;
  v_padded      TEXT;
BEGIN
  -- Get the single settings row (with lock to prevent race conditions)
  SELECT id, invoice_prefix, invoice_next_num
  INTO v_id, v_prefix, v_next_num
  FROM firm_settings
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- No settings row yet; use defaults (invoice will get INV-0001)
    v_prefix   := 'INV';
    v_next_num := 1;
  END IF;

  v_padded := lpad(v_next_num::TEXT, 4, '0');
  NEW.invoice_number := v_prefix || '-' || v_padded;

  -- Only increment counter if we found a row (uses WHERE to satisfy PostgREST safety)
  IF v_id IS NOT NULL THEN
    UPDATE firm_settings
    SET invoice_next_num = v_next_num + 1
    WHERE id = v_id;
  END IF;

  RETURN NEW;
END;
$$;
