import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { getInitials } from '@/lib/utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch staff profile and firm settings
  const [{ data: staff }, { data: settings }] = await Promise.all([
    supabase.from('staff').select('full_name, email').eq('id', user.id).single(),
    supabase.from('firm_settings').select('firm_name').single(),
  ])

  const displayEmail = staff?.email ?? user.email ?? ''
  const displayName = staff?.full_name ?? displayEmail
  const firmName = settings?.firm_name ?? 'Web Firm'

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar
        firmName={firmName}
        userEmail={displayEmail}
        userInitials={getInitials(displayName)}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
