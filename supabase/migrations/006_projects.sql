-- ============================================================
-- Migration 006: Projects table
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  agreement_id  uuid REFERENCES agreements(id) ON DELETE SET NULL, -- signed agreement that unlocks active status
  assigned_to   uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id   ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);

-- updated_at trigger
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Add project_id to agreements
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agreements_project_id ON agreements(project_id);

-- 3. Add project_id and agreement_id to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS project_id   uuid REFERENCES projects(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES agreements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id   ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agreement_id ON invoices(agreement_id);

-- 4. Add project_id to client_invitations (if that table exists)
ALTER TABLE client_invitations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- 5. RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Staff: admins see all, PMs see assigned
CREATE POLICY "projects_staff_all" ON projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE staff.id = auth.uid()
        AND staff.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM staff WHERE staff.id = auth.uid()
        AND staff.role IN ('project_manager', 'member')
        AND projects.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid())
  );

-- Portal clients: can view projects they're linked to
CREATE POLICY "projects_client_read" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = projects.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );
