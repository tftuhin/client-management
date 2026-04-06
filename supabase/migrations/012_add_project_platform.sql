-- ============================================================
-- Migration 012: Add project platform field
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('upwork', 'outside'));

CREATE INDEX IF NOT EXISTS idx_projects_platform ON projects(platform);
