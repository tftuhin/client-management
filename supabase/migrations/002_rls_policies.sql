-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE next_offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_settings       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: is the current user an active staff member?
-- ============================================================
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;

-- Helper function: is the current user an owner or admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin')
  );
$$;

-- Helper function: is the current user the owner?
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE id = auth.uid()
    AND is_active = true
    AND role = 'owner'
  );
$$;

-- ============================================================
-- STAFF policies
-- ============================================================

-- Any authenticated staff can view all staff profiles
CREATE POLICY "staff_select" ON staff
  FOR SELECT USING (is_staff());

-- Staff can update their own profile
CREATE POLICY "staff_update_own" ON staff
  FOR UPDATE USING (id = auth.uid());

-- Admins can update any staff profile
CREATE POLICY "staff_update_admin" ON staff
  FOR UPDATE USING (is_admin());

-- Only admins can insert new staff (via invite flow)
CREATE POLICY "staff_insert_admin" ON staff
  FOR INSERT WITH CHECK (is_admin());

-- Only owner can delete staff
CREATE POLICY "staff_delete_owner" ON staff
  FOR DELETE USING (is_owner() AND id != auth.uid());

-- ============================================================
-- CLIENTS policies
-- ============================================================

CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (is_staff());

CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (is_staff());

-- Only admins can permanently delete clients
CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (is_admin());

-- ============================================================
-- PROJECT REQUIREMENTS policies
-- ============================================================

CREATE POLICY "project_req_select" ON project_requirements
  FOR SELECT USING (is_staff());

CREATE POLICY "project_req_insert" ON project_requirements
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "project_req_update" ON project_requirements
  FOR UPDATE USING (is_staff());

CREATE POLICY "project_req_delete" ON project_requirements
  FOR DELETE USING (is_admin());

-- ============================================================
-- AGREEMENTS policies
-- ============================================================

CREATE POLICY "agreements_select" ON agreements
  FOR SELECT USING (is_staff());

CREATE POLICY "agreements_insert" ON agreements
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "agreements_update" ON agreements
  FOR UPDATE USING (is_staff());

CREATE POLICY "agreements_delete" ON agreements
  FOR DELETE USING (is_admin());

-- ============================================================
-- INVOICES policies
-- ============================================================

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (is_staff());

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (is_staff());

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (is_admin());

-- ============================================================
-- INVOICE LINE ITEMS policies
-- ============================================================

CREATE POLICY "line_items_select" ON invoice_line_items
  FOR SELECT USING (is_staff());

CREATE POLICY "line_items_insert" ON invoice_line_items
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "line_items_update" ON invoice_line_items
  FOR UPDATE USING (is_staff());

CREATE POLICY "line_items_delete" ON invoice_line_items
  FOR DELETE USING (is_staff());

-- ============================================================
-- INVOICE PAYMENTS policies
-- ============================================================

CREATE POLICY "payments_select" ON invoice_payments
  FOR SELECT USING (is_staff());

CREATE POLICY "payments_insert" ON invoice_payments
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "payments_update" ON invoice_payments
  FOR UPDATE USING (is_admin());

CREATE POLICY "payments_delete" ON invoice_payments
  FOR DELETE USING (is_admin());

-- ============================================================
-- DOCUMENTS policies
-- ============================================================

CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (is_staff());

CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (is_staff());

CREATE POLICY "documents_delete" ON documents
  FOR DELETE USING (is_staff());

-- ============================================================
-- MESSAGES policies
-- ============================================================

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (is_staff());

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (is_staff());

-- Authors can update their own messages; admins can update any
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "messages_update_admin" ON messages
  FOR UPDATE USING (is_admin());

-- Authors can delete their own messages; admins can delete any
CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE USING (author_id = auth.uid());

CREATE POLICY "messages_delete_admin" ON messages
  FOR DELETE USING (is_admin());

-- ============================================================
-- ACTIVITY LOG policies
-- ============================================================

-- Activity log is read-only for staff; writes happen via triggers/service role
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT USING (is_staff());

-- Allow inserts from staff (triggers run as SECURITY DEFINER)
CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT WITH CHECK (is_staff());

-- No updates or deletes on activity log (immutable audit trail)

-- ============================================================
-- NEXT OFFERS policies
-- ============================================================

CREATE POLICY "offers_select" ON next_offers
  FOR SELECT USING (is_staff());

CREATE POLICY "offers_insert" ON next_offers
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "offers_update" ON next_offers
  FOR UPDATE USING (is_staff());

CREATE POLICY "offers_delete" ON next_offers
  FOR DELETE USING (is_staff());

-- ============================================================
-- AGREEMENT TEMPLATES policies
-- ============================================================

CREATE POLICY "templates_select" ON agreement_templates
  FOR SELECT USING (is_staff());

CREATE POLICY "templates_insert" ON agreement_templates
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "templates_update" ON agreement_templates
  FOR UPDATE USING (is_admin());

CREATE POLICY "templates_delete" ON agreement_templates
  FOR DELETE USING (is_admin());

-- ============================================================
-- FIRM SETTINGS policies
-- ============================================================

CREATE POLICY "firm_settings_select" ON firm_settings
  FOR SELECT USING (is_staff());

-- Only owner can modify firm settings
CREATE POLICY "firm_settings_update" ON firm_settings
  FOR UPDATE USING (is_owner());

CREATE POLICY "firm_settings_insert" ON firm_settings
  FOR INSERT WITH CHECK (is_owner());
