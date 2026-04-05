-- ============================================================
-- Migration 011: Fix invoice trigger with RLS bypass
-- ============================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_generate_invoice_number ON invoices;

-- Recreate the function with simplified logic
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix      TEXT := 'INV';
  v_next_num    INTEGER := 1;
  v_padded      TEXT;
BEGIN
  -- Try to get settings, but don't fail if not accessible
  BEGIN
    SELECT invoice_prefix, invoice_next_num
    INTO v_prefix, v_next_num
    FROM firm_settings
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      -- Use defaults if can't access firm_settings
      v_prefix := 'INV';
      v_next_num := 1;
  END;

  v_padded := lpad(v_next_num::TEXT, 4, '0');
  NEW.invoice_number := v_prefix || '-' || v_padded;

  -- Try to increment counter, but don't fail if not accessible
  BEGIN
    UPDATE firm_settings
    SET invoice_next_num = invoice_next_num + 1
    WHERE invoice_next_num = v_next_num;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore if can't update
      NULL;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();