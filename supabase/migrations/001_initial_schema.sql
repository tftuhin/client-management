-- ============================================================
-- 001_initial_schema.sql
-- Full database schema for CRM Web Firm application
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE pipeline_stage AS ENUM (
  'lead',
  'prospect',
  'proposal_sent',
  'negotiation',
  'active',
  'on_hold',
  'completed',
  'churned'
);

CREATE TYPE agreement_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'signed',
  'expired',
  'cancelled'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE message_type AS ENUM (
  'internal_note',
  'client_message',
  'system_event'
);

CREATE TYPE offer_status AS ENUM (
  'draft',
  'proposed',
  'accepted',
  'declined'
);

CREATE TYPE document_type AS ENUM (
  'project_brief',
  'requirements',
  'contract',
  'invoice_attachment',
  'design_asset',
  'other'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Staff table (mirrors auth.users)
CREATE TABLE staff (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients table
CREATE TABLE clients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name      TEXT NOT NULL,
  contact_name      TEXT NOT NULL,
  contact_email     TEXT NOT NULL,
  contact_phone     TEXT,
  website_url       TEXT,
  industry          TEXT,
  company_size      TEXT,
  annual_revenue    TEXT,
  country           TEXT,
  address           TEXT,
  pipeline_stage    pipeline_stage NOT NULL DEFAULT 'lead',
  pipeline_order    INTEGER NOT NULL DEFAULT 0,
  assigned_to       UUID REFERENCES staff(id) ON DELETE SET NULL,
  lead_source       TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  notes             TEXT,
  avatar_url        TEXT,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project requirements
CREATE TABLE project_requirements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_name      TEXT NOT NULL,
  project_type      TEXT,
  description       TEXT,
  budget_min        NUMERIC(12,2),
  budget_max        NUMERIC(12,2),
  timeline_weeks    INTEGER,
  deadline          DATE,
  tech_preferences  TEXT[] NOT NULL DEFAULT '{}',
  priority_features TEXT[] NOT NULL DEFAULT '{}',
  competitors       TEXT[] NOT NULL DEFAULT '{}',
  target_audience   TEXT,
  special_notes     TEXT,
  is_current        BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Firm settings (single row)
CREATE TABLE firm_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_name             TEXT NOT NULL DEFAULT 'My Web Firm',
  firm_logo_url         TEXT,
  firm_address          TEXT,
  firm_email            TEXT,
  firm_phone            TEXT,
  invoice_prefix        TEXT NOT NULL DEFAULT 'INV',
  invoice_next_num      INTEGER NOT NULL DEFAULT 1,
  default_currency      TEXT NOT NULL DEFAULT 'USD',
  default_tax_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_payment_terms TEXT,
  invoice_footer        TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreement templates
CREATE TABLE agreement_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  content     TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreements
CREATE TABLE agreements (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  content               TEXT NOT NULL,
  status                agreement_status NOT NULL DEFAULT 'draft',
  template_used         UUID REFERENCES agreement_templates(id) ON DELETE SET NULL,
  sent_at               TIMESTAMPTZ,
  sent_by               UUID REFERENCES staff(id) ON DELETE SET NULL,
  viewed_at             TIMESTAMPTZ,
  signed_at             TIMESTAMPTZ,
  client_signature_name TEXT,
  firm_signed_at        TIMESTAMPTZ,
  firm_signer           UUID REFERENCES staff(id) ON DELETE SET NULL,
  expires_at            TIMESTAMPTZ,
  pdf_storage_path      TEXT,
  version               INTEGER NOT NULL DEFAULT 1,
  parent_id             UUID REFERENCES agreements(id) ON DELETE SET NULL,
  created_by            UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  status            invoice_status NOT NULL DEFAULT 'draft',
  currency          TEXT NOT NULL DEFAULT 'USD',
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_flat     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_pct           NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(12,2) NOT NULL DEFAULT 0,
  issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE NOT NULL,
  sent_at           TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  payment_terms     TEXT,
  pdf_storage_path  TEXT,
  created_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice line items
CREATE TABLE invoice_line_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice payments
CREATE TABLE invoice_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  method      TEXT,
  reference   TEXT,
  notes       TEXT,
  recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  document_type           document_type NOT NULL DEFAULT 'other',
  description             TEXT,
  storage_path            TEXT NOT NULL,
  file_size               BIGINT,
  mime_type               TEXT,
  is_shared_with_client   BOOLEAN NOT NULL DEFAULT false,
  shared_at               TIMESTAMPTZ,
  uploaded_by             UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages / Notes
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message_type        message_type NOT NULL DEFAULT 'internal_note',
  content             TEXT NOT NULL,
  is_pinned           BOOLEAN NOT NULL DEFAULT false,
  linked_entity_type  TEXT,
  linked_entity_id    UUID,
  author_id           UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES staff(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Next offers (upsell opportunities)
CREATE TABLE next_offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  description     TEXT,
  estimated_value NUMERIC(12,2),
  status          offer_status NOT NULL DEFAULT 'draft',
  proposed_at     TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  follow_up_date  DATE,
  created_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- clients
CREATE INDEX idx_clients_pipeline_stage     ON clients(pipeline_stage);
CREATE INDEX idx_clients_assigned_to        ON clients(assigned_to);
CREATE INDEX idx_clients_is_archived        ON clients(is_archived);
CREATE INDEX idx_clients_contact_email      ON clients(contact_email);
CREATE INDEX idx_clients_created_at         ON clients(created_at DESC);
CREATE INDEX idx_clients_pipeline_order     ON clients(pipeline_stage, pipeline_order);

-- project_requirements
CREATE INDEX idx_project_req_client_id      ON project_requirements(client_id);
CREATE INDEX idx_project_req_is_current     ON project_requirements(client_id, is_current);

-- agreements
CREATE INDEX idx_agreements_client_id       ON agreements(client_id);
CREATE INDEX idx_agreements_status          ON agreements(status);
CREATE INDEX idx_agreements_created_at      ON agreements(created_at DESC);

-- invoices
CREATE INDEX idx_invoices_client_id         ON invoices(client_id);
CREATE INDEX idx_invoices_status            ON invoices(status);
CREATE INDEX idx_invoices_due_date          ON invoices(due_date);
CREATE INDEX idx_invoices_created_at        ON invoices(created_at DESC);

-- invoice_line_items
CREATE INDEX idx_line_items_invoice_id      ON invoice_line_items(invoice_id, sort_order);

-- invoice_payments
CREATE INDEX idx_payments_invoice_id        ON invoice_payments(invoice_id);

-- documents
CREATE INDEX idx_documents_client_id        ON documents(client_id);
CREATE INDEX idx_documents_type             ON documents(document_type);

-- messages
CREATE INDEX idx_messages_client_id         ON messages(client_id);
CREATE INDEX idx_messages_is_pinned         ON messages(client_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_messages_created_at        ON messages(created_at DESC);

-- activity_log
CREATE INDEX idx_activity_log_client_id     ON activity_log(client_id);
CREATE INDEX idx_activity_log_actor_id      ON activity_log(actor_id);
CREATE INDEX idx_activity_log_event_type    ON activity_log(event_type);
CREATE INDEX idx_activity_log_created_at    ON activity_log(created_at DESC);

-- next_offers
CREATE INDEX idx_next_offers_client_id      ON next_offers(client_id);
CREATE INDEX idx_next_offers_status         ON next_offers(status);
CREATE INDEX idx_next_offers_follow_up      ON next_offers(follow_up_date);
