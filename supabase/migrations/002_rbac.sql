-- ============================================================
-- Migration 002: RBAC — 3-role user system
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Update staff role enum to include project_manager
-- (existing 'member' rows are treated identically to 'project_manager')
ALTER TABLE staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_role_check
  CHECK (role IN ('owner', 'admin', 'project_manager', 'member'));

-- 2. Add auth_user_id to clients — links a client record to a Supabase auth user
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_id_idx
  ON clients (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 3. Reviews table — clients leave reviews via the portal
CREATE TABLE IF NOT EXISTS reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES auth.users(id),
  rating        int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content       text,
  project_name  text,
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Staff can read all reviews; clients can read/insert their own
CREATE POLICY "staff read reviews"
  ON reviews FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid())
  );

CREATE POLICY "client read own reviews"
  ON reviews FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "client insert review"
  ON reviews FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_id
        AND clients.auth_user_id = auth.uid()
    )
  );

-- 4. Client invitations table — tracks portal invite status
CREATE TABLE IF NOT EXISTS client_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invited_by  uuid NOT NULL REFERENCES staff(id),
  email       text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage invitations"
  ON client_invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

-- 5. RLS for clients table — PMs can only see their assigned clients
-- (Enable RLS if not already enabled)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff access clients" ON clients;
CREATE POLICY "staff access clients"
  ON clients FOR ALL
  USING (
    -- Admins/owners see all
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
        AND staff.role IN ('owner', 'admin')
    )
    OR
    -- PMs see only their assigned clients
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
        AND staff.role IN ('project_manager', 'member')
        AND clients.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid())
  );

-- Portal clients can see only their own record
DROP POLICY IF EXISTS "client portal access own record" ON clients;
CREATE POLICY "client portal access own record"
  ON clients FOR SELECT
  USING (auth_user_id = auth.uid());

-- 6. RLS for reviews access from the portal
-- (Messages, invoices, agreements — clients see only their own)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff access messages" ON messages;
CREATE POLICY "staff access messages"
  ON messages FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

DROP POLICY IF EXISTS "client read own messages" ON messages;
CREATE POLICY "client read own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client insert own message" ON messages;
CREATE POLICY "client insert own message"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_id
        AND clients.auth_user_id = auth.uid()
    )
    AND message_type = 'client_message'
    AND author_id = auth.uid()
  );

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff access invoices" ON invoices;
CREATE POLICY "staff access invoices"
  ON invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

DROP POLICY IF EXISTS "client read own invoices" ON invoices;
CREATE POLICY "client read own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = invoices.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );

ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff access agreements" ON agreements;
CREATE POLICY "staff access agreements"
  ON agreements FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

DROP POLICY IF EXISTS "client read own agreements" ON agreements;
CREATE POLICY "client read own agreements"
  ON agreements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = agreements.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );

ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff access project_requirements" ON project_requirements;
CREATE POLICY "staff access project_requirements"
  ON project_requirements FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

DROP POLICY IF EXISTS "client read own project_requirements" ON project_requirements;
CREATE POLICY "client read own project_requirements"
  ON project_requirements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = project_requirements.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );
