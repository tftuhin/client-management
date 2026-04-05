-- ============================================================
-- Migration 010: Fix firm_settings RLS for invoice trigger
-- ============================================================

-- Allow all authenticated users to access firm_settings for invoice numbering
DROP POLICY IF EXISTS "firm_settings_select" ON firm_settings;
CREATE POLICY "firm_settings_select" ON firm_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "firm_settings_update" ON firm_settings;
CREATE POLICY "firm_settings_update" ON firm_settings
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');