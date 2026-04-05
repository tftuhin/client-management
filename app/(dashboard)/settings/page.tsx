import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FirmSettingsForm } from '@/components/settings/firm-settings-form'
import { TeamTable } from '@/components/settings/team-table'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: settings }, { data: staff }, { data: currentStaff }] = await Promise.all([
    supabase.from('firm_settings').select('*').single(),
    supabase.from('staff').select('id, full_name, email, role, is_active, created_at').order('created_at'),
    supabase.from('staff').select('id, full_name, email, role').eq('id', user!.id).single(),
  ])

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your firm and account settings</p>
      </div>

      <Tabs defaultValue="firm">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="firm">Firm</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="profile">My profile</TabsTrigger>
        </TabsList>

        <TabsContent value="firm" className="mt-6">
          <FirmSettingsForm
            settings={settings}
            isOwner={currentStaff?.role === 'owner'}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTable
            staff={staff ?? []}
            currentUserId={user!.id}
            isAdmin={['owner', 'admin'].includes(currentStaff?.role ?? '')}
          />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm currentStaff={currentStaff} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
