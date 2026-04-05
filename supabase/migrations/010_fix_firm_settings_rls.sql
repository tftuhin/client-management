-- ============================================================
-- Migration 010: Fix firm_settings RLS for invoice trigger
-- ============================================================

-- Allow all authenticated users to read firm_settings for invoice numbering
DROP POLICY IF EXISTS "firm_settings_select" ON firm_settings;
CREATE POLICY "firm_settings_select" ON firm_settings
  FOR SELECT USING (auth.role() = 'authenticated');