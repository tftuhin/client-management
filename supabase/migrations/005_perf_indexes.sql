-- ============================================================
-- 005_perf_indexes.sql
-- Performance indexes for common query patterns
-- ============================================================

-- Add composite index for staff role + is_active (used in email fan-out queries)
CREATE INDEX idx_staff_role_active ON staff(role, is_active) WHERE is_active = true;

-- Add composite index for clients assigned_to + is_archived (used in PM-scoped list views)
CREATE INDEX idx_clients_assigned_archived ON clients(assigned_to, is_archived);
