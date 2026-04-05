-- ============================================================
-- Migration 008: Agreement change request history
-- ============================================================

-- Create table for tracking all change requests with full history
CREATE TABLE IF NOT EXISTS agreement_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL, -- Can be staff or client user
  requested_by_type text NOT NULL CHECK (requested_by_type IN ('staff', 'client')),
  change_reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  reviewed_by uuid, -- Staff who reviewed the request
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_agreement_change_requests_agreement_id ON agreement_change_requests(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_change_requests_status ON agreement_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_agreement_change_requests_requested_by ON agreement_change_requests(requested_by);

-- Enable RLS
ALTER TABLE agreement_change_requests ENABLE ROW LEVEL SECURITY;

-- Staff can see all change requests
CREATE POLICY "staff access change requests"
  ON agreement_change_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

-- Clients can see change requests for their agreements
CREATE POLICY "client access own change requests"
  ON agreement_change_requests FOR SELECT
  USING (
    requested_by_type = 'client'
    AND requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agreements a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = agreement_change_requests.agreement_id
      AND (
        c.auth_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM client_portal_users cpu WHERE cpu.client_id = c.id AND cpu.auth_user_id = auth.uid())
      )
    )
  );

-- Clients can insert their own change requests
CREATE POLICY "client insert own change requests"
  ON agreement_change_requests FOR INSERT
  WITH CHECK (
    requested_by_type = 'client'
    AND requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM agreements a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = agreement_change_requests.agreement_id
      AND (
        c.auth_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM client_portal_users cpu WHERE cpu.client_id = c.id AND cpu.auth_user_id = auth.uid())
      )
    )
  );

-- Add updated_at trigger
CREATE TRIGGER trg_agreement_change_requests_updated_at
  BEFORE UPDATE ON agreement_change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();