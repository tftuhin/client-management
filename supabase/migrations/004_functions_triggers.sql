-- ============================================================
-- 004_functions_triggers.sql
-- Database functions and triggers
-- ============================================================

-- ============================================================
-- update_updated_at
-- Generic trigger function to keep updated_at current
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_project_req_updated_at
  BEFORE UPDATE ON project_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agreements_updated_at
  BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_next_offers_updated_at
  BEFORE UPDATE ON next_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agreement_templates_updated_at
  BEFORE UPDATE ON agreement_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_firm_settings_updated_at
  BEFORE UPDATE ON firm_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- generate_invoice_number
-- Auto-generates invoice numbers like INV-0001 on INSERT
-- ============================================================

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
  -- Lock the firm_settings row to prevent race conditions
  SELECT id, invoice_prefix, invoice_next_num
  INTO v_id, v_prefix, v_next_num
  FROM firm_settings
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prefix   := 'INV';
    v_next_num := 1;
  END IF;

  v_padded := lpad(v_next_num::TEXT, 4, '0');
  NEW.invoice_number := v_prefix || '-' || v_padded;

  -- Only increment the counter if we found a row
  IF v_id IS NOT NULL THEN
    UPDATE firm_settings
    SET invoice_next_num = v_next_num + 1
    WHERE id = v_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- recalculate_invoice_totals
-- Recomputes subtotal, tax_amount, and total on invoices
-- whenever line items change
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id  UUID;
  v_subtotal    NUMERIC(12,2);
  v_discount_pct  NUMERIC(5,2);
  v_discount_flat NUMERIC(12,2);
  v_tax_pct     NUMERIC(5,2);
  v_discounted  NUMERIC(12,2);
  v_tax_amount  NUMERIC(12,2);
  v_total       NUMERIC(12,2);
BEGIN
  -- Determine which invoice to update
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Sum all line items
  SELECT COALESCE(SUM(amount), 0)
  INTO v_subtotal
  FROM invoice_line_items
  WHERE invoice_id = v_invoice_id;

  -- Get current discount/tax settings
  SELECT discount_pct, discount_flat, tax_pct
  INTO v_discount_pct, v_discount_flat, v_tax_pct
  FROM invoices
  WHERE id = v_invoice_id;

  -- Calculate totals
  v_discounted := v_subtotal - COALESCE(v_discount_flat, 0);
  IF v_discount_pct > 0 THEN
    v_discounted := v_discounted * (1 - v_discount_pct / 100);
  END IF;
  v_discounted  := GREATEST(v_discounted, 0);
  v_tax_amount  := v_discounted * (COALESCE(v_tax_pct, 0) / 100);
  v_total       := v_discounted + v_tax_amount;

  UPDATE invoices
  SET
    subtotal   = v_subtotal,
    tax_amount = v_tax_amount,
    total      = v_total
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_totals_after_line_item_insert
  AFTER INSERT ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

CREATE TRIGGER trg_recalc_totals_after_line_item_update
  AFTER UPDATE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

CREATE TRIGGER trg_recalc_totals_after_line_item_delete
  AFTER DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

-- ============================================================
-- sync_invoice_amount_paid
-- Keeps amount_paid in sync when payments are recorded/deleted
-- Also updates invoice status based on payment amount
-- ============================================================

CREATE OR REPLACE FUNCTION sync_invoice_amount_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id  UUID;
  v_total_paid  NUMERIC(12,2);
  v_total       NUMERIC(12,2);
  v_new_status  invoice_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = v_invoice_id;

  SELECT total INTO v_total
  FROM invoices
  WHERE id = v_invoice_id;

  -- Determine new status
  IF v_total_paid >= v_total AND v_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    -- Don't downgrade from 'sent'/'viewed' back to 'draft'
    SELECT CASE
      WHEN status IN ('draft', 'cancelled', 'overdue') THEN status
      ELSE status  -- keep current status if no payments
    END
    INTO v_new_status
    FROM invoices
    WHERE id = v_invoice_id;
  END IF;

  UPDATE invoices
  SET
    amount_paid = v_total_paid,
    status      = v_new_status,
    paid_at     = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_amount_paid_insert
  AFTER INSERT ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_amount_paid();

CREATE TRIGGER trg_sync_amount_paid_update
  AFTER UPDATE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_amount_paid();

CREATE TRIGGER trg_sync_amount_paid_delete
  AFTER DELETE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_amount_paid();

-- ============================================================
-- log_invoice_status_change
-- Inserts an activity_log entry whenever invoice status changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (client_id, actor_id, event_type, description, metadata)
    VALUES (
      NEW.client_id,
      auth.uid(),
      'invoice_status_changed',
      'Invoice ' || NEW.invoice_number || ' status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'invoice_id',     NEW.id,
        'invoice_number', NEW.invoice_number,
        'old_status',     OLD.status,
        'new_status',     NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_invoice_status
  AFTER UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_invoice_status_change();

-- ============================================================
-- log_agreement_status_change
-- Inserts an activity_log entry when agreement status changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_agreement_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (client_id, actor_id, event_type, description, metadata)
    VALUES (
      NEW.client_id,
      auth.uid(),
      'agreement_status_changed',
      'Agreement "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'agreement_id', NEW.id,
        'title',        NEW.title,
        'old_status',   OLD.status,
        'new_status',   NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_agreement_status
  AFTER UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION log_agreement_status_change();

-- ============================================================
-- log_pipeline_change
-- Inserts an activity_log entry when a client changes pipeline stage
-- ============================================================

CREATE OR REPLACE FUNCTION log_pipeline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO activity_log (client_id, actor_id, event_type, description, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'pipeline_stage_changed',
      NEW.company_name || ' moved from ' || OLD.pipeline_stage || ' to ' || NEW.pipeline_stage,
      jsonb_build_object(
        'client_id',   NEW.id,
        'old_stage',   OLD.pipeline_stage,
        'new_stage',   NEW.pipeline_stage
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_pipeline_change
  AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_pipeline_change();

-- ============================================================
-- handle_new_user
-- Creates a staff row whenever a new user signs up via Auth
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_count INTEGER;
BEGIN
  -- First user becomes owner, subsequent users become members
  SELECT COUNT(*) INTO v_count FROM staff;
  IF v_count = 0 THEN
    v_role := 'owner';
  ELSE
    v_role := 'member';
  END IF;

  INSERT INTO staff (id, full_name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    v_role,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
