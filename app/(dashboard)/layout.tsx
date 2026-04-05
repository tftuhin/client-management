import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { getInitials } from '@/lib/utils'
import type { StaffRole } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Client portal users must not access the staff dashboard
  if (user.user_metadata?.user_type === 'client') redirect('/portal')

  const [{ data: staff }, { data: settings }] = await Promise.all([
    supabase.from('staff').select('full_name, email, role').eq('id', user.id).single(),
    supabase.from('firm_settings').select('firm_name').single(),
  ])

  // If no staff row exists yet (e.g. trigger not applied), treat as admin so data isn't hidden
  const role: StaffRole = (staff?.role as StaffRole) ?? 'admin'

  const displayEmail = staff?.email ?? user.email ?? ''
  const displayName = staff?.full_name ?? displayEmail
  const firmName = settings?.firm_name ?? 'Zeon CRM'

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar
        firmName={firmName}
        userEmail={displayEmail}
        userInitials={getInitials(displayName)}
        role={role}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
