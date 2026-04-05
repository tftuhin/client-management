-- ============================================================
-- Migration 011: Fix invoice trigger with RLS bypass
-- ============================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_generate_invoice_number ON invoices;

-- Recreate the function with RLS bypass
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
  -- Bypass RLS for this operation
  SET LOCAL session_replication_role = 'replica';

  -- Lock the firm_settings row to prevent race conditions
  SELECT id, invoice_prefix, invoice_next_num
  INTO v_id, v_prefix, v_next_num
  FROM firm_settings
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Insert default firm settings if none exist
    INSERT INTO firm_settings (
      id,
      firm_name,
      invoice_prefix,
      invoice_next_num,
      default_currency,
      default_tax_pct,
      default_payment_terms
    ) VALUES (
      gen_random_uuid(),
      'Default Firm',
      'INV',
      1,
      'USD',
      0.00,
      'Net 30'
    )
    RETURNING id, invoice_prefix, invoice_next_num
    INTO v_id, v_prefix, v_next_num;
  END IF;

  v_padded := lpad(v_next_num::TEXT, 4, '0');
  NEW.invoice_number := v_prefix || '-' || v_padded;

  -- Increment the counter
  UPDATE firm_settings
  SET invoice_next_num = v_next_num + 1
  WHERE id = v_id;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();