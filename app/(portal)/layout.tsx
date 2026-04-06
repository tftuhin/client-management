import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalSidebar } from '@/components/layout/portal-sidebar'
import { PortalMobileSidebar } from '@/components/layout/portal-mobile-sidebar'
import { getInitials } from '@/lib/utils'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Staff must not access the client portal
  if (!user.user_metadata?.user_type || user.user_metadata.user_type !== 'client') {
    redirect('/dashboard')
  }

  const clientId: string | undefined = user.user_metadata?.client_id

  const { data: client } = clientId
    ? await supabase
        .from('clients')
        .select('contact_name, company_name')
        .eq('id', clientId)
        .single()
    : { data: null }

  const displayName = client?.contact_name ?? user.email ?? 'Client'
  const companyName = client?.company_name ?? ''

  return (
    <div className="flex flex-col h-full min-h-screen md:flex-row">
      <header className="flex md:hidden h-14 items-center justify-between border-b px-4 bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
            Z
          </div>
          <span className="font-semibold text-sm truncate">Client Portal</span>
        </div>
        <PortalMobileSidebar
          clientName={displayName}
          companyName={companyName}
          initials={getInitials(displayName)}
        />
      </header>

      <div className="hidden md:flex flex-col min-h-screen shrink-0">
        <PortalSidebar
          clientName={displayName}
          companyName={companyName}
          initials={getInitials(displayName)}
        />
      </div>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
