import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
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
    <div className="flex flex-col h-full min-h-screen md:flex-row">
      <header className="flex md:hidden h-14 items-center justify-between border-b px-4 bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
            Z
          </div>
          <span className="font-semibold text-sm truncate">{firmName}</span>
        </div>
        <MobileSidebar
          firmName={firmName}
          userEmail={displayEmail}
          userInitials={getInitials(displayName)}
          role={role}
        />
      </header>

      <div className="hidden md:flex flex-col min-h-screen shrink-0">
        <Sidebar
          firmName={firmName}
          userEmail={displayEmail}
          userInitials={getInitials(displayName)}
          role={role}
        />
      </div>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
