import type { StaffRole } from '@/types/database'

// ---------------------------------------------------------------------------
// Role hierarchy helpers
// ---------------------------------------------------------------------------

/** Returns true for owner and admin — full CRM access */
export function isAdmin(role: StaffRole | string): boolean {
  return role === 'owner' || role === 'admin'
}

/** Returns true for project_manager and member (treated identically) */
export function isProjectManager(role: StaffRole | string): boolean {
  return role === 'project_manager' || role === 'member'
}

/** Any authenticated staff member (not a client portal user) */
export function isStaff(role: StaffRole | string): boolean {
  return isAdmin(role) || isProjectManager(role)
}

// ---------------------------------------------------------------------------
// Feature-level permissions
// ---------------------------------------------------------------------------

/** Admins only: firm settings, staff management, hard deletes */
export const can = {
  manageFirmSettings: (role: StaffRole | string) => isAdmin(role),
  manageStaff: (role: StaffRole | string) => isAdmin(role),
  hardDelete: (role: StaffRole | string) => isAdmin(role),
  archiveClients: (role: StaffRole | string) => isAdmin(role),
  viewAllClients: (role: StaffRole | string) => isAdmin(role),

  // Both admin and PM:
  createClient: (_: StaffRole | string) => true,
  inviteClient: (_: StaffRole | string) => true,
  createInvoice: (_: StaffRole | string) => true,
  createAgreement: (_: StaffRole | string) => true,
  createOffer: (_: StaffRole | string) => true,
  changePipelineStage: (_: StaffRole | string) => true,
  messageClient: (_: StaffRole | string) => true,
} as const

// ---------------------------------------------------------------------------
// Data scoping: for PMs, queries must be filtered to their assigned clients
// ---------------------------------------------------------------------------

/**
 * Returns a Supabase `.eq()` filter pair when the role requires client scoping,
 * or null when the user can see everything.
 *
 * Usage:
 *   const scope = clientScope(role, userId)
 *   if (scope) query = query.eq(scope.column, scope.value)
 */
export function clientScope(
  role: StaffRole | string,
  userId: string
): { column: 'assigned_to'; value: string } | null {
  if (isAdmin(role)) return null
  return { column: 'assigned_to', value: userId }
}
