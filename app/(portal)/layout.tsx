import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalSidebar } from '@/components/layout/portal-sidebar'
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
    <div className="flex h-full min-h-screen">
      <PortalSidebar
        clientName={displayName}
        companyName={companyName}
        initials={getInitials(displayName)}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
