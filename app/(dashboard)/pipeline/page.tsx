import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { NewClientSheet } from '@/components/clients/new-client-sheet'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { clientScope } from '@/lib/permissions'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRow } = user
    ? await supabase.from('staff').select('role').eq('id', user.id).single()
    : { data: null }
  // If no staff record exists yet, treat as admin (no scoping) — layout already blocks client users
  const scope = clientScope(staffRow?.role ?? 'admin', user?.id ?? '')

  let query = supabase
    .from('clients')
    .select('id, company_name, contact_name, pipeline_stage, pipeline_order, industry, tags, is_archived')
    .eq('is_archived', false)
    .order('pipeline_order', { ascending: true })

  if (scope) query = query.eq(scope.column, scope.value)

  const { data: clients } = await query

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 pb-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients?.length ?? 0} clients across all stages
          </p>
        </div>
        <NewClientSheet>
          <Button>
            <Plus className="size-4" />
            Add client
          </Button>
        </NewClientSheet>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard initialClients={clients ?? []} />
      </div>
    </div>
  )
}
