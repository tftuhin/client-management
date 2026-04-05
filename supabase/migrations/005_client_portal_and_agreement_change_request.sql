-- ============================================================
-- Migration 005: Client portal users + signed agreement change requests
-- ============================================================

-- 1. Add agreement request metadata
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS change_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS change_reason text;

-- 2. Add client portal user mapping for multi-person access under one company
CREATE TABLE IF NOT EXISTS client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id)
);

ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff access portal users"
  ON client_portal_users FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

CREATE POLICY "client access own portal user select"
  ON client_portal_users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "client access own portal user update"
  ON client_portal_users FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "client access own portal user delete"
  ON client_portal_users FOR DELETE
  USING (auth_user_id = auth.uid());

CREATE POLICY "client insert own portal user"
  ON client_portal_users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- 3. Extend client portal lookup to allow client_portal_users
DROP POLICY IF EXISTS "client portal access own record" ON clients;
CREATE POLICY "client portal access own record select"
  ON clients FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM client_portal_users
      WHERE client_portal_users.client_id = clients.id
        AND client_portal_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "client portal access own record update"
  ON clients FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM client_portal_users
      WHERE client_portal_users.client_id = clients.id
        AND client_portal_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM client_portal_users
      WHERE client_portal_users.client_id = clients.id
        AND client_portal_users.auth_user_id = auth.uid()
    )
  );

-- 4. Extend client portal read access for related tables
DROP POLICY IF EXISTS "client read own reviews" ON reviews;
CREATE POLICY "client read own reviews"
  ON reviews FOR SELECT
  USING (
    author_id = auth.uid()
  );

DROP POLICY IF EXISTS "client insert review" ON reviews;
CREATE POLICY "client insert review"
  ON reviews FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "client read own messages" ON messages;
CREATE POLICY "client read own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "client insert own message" ON messages;
CREATE POLICY "client insert own message"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
    AND message_type = 'client_message'
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "client read own invoices" ON invoices;
CREATE POLICY "client read own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = invoices.client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "client read own agreements" ON agreements;
CREATE POLICY "client read own agreements"
  ON agreements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = agreements.client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "client update own agreements" ON agreements;
CREATE POLICY "client update own agreements"
  ON agreements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = agreements.client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = agreements.client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "client read own project_requirements" ON project_requirements;
CREATE POLICY "client read own project_requirements"
  ON project_requirements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = project_requirements.client_id
        AND (
          clients.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_portal_users
            WHERE client_portal_users.client_id = clients.id
              AND client_portal_users.auth_user_id = auth.uid()
          )
        )
    )
  );
