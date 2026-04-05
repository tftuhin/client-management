import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus, FolderOpen } from 'lucide-react'
import { clientScope } from '@/lib/permissions'
import type { StaffRole, ProjectStatus } from '@/types/database'
import { formatDate } from '@/lib/utils'

const STATUS_STYLE: Record<ProjectStatus, string> = {
  planning:  'bg-gray-50 text-gray-600 border-gray-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_hold:   'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-400 border-red-200',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRow } = user
    ? await supabase.from('staff').select('role').eq('id', user.id).single()
    : { data: null }
  const role = (staffRow?.role ?? 'admin') as StaffRole
  const scope = clientScope(role, user?.id ?? '')

  let query = supabase
    .from('projects')
    .select('id, name, status, created_at, client_id, clients(company_name), staff:assigned_to(full_name)')
    .order('created_at', { ascending: false })

  if (scope) query = query.eq('assigned_to', scope.value)
  if (params.status) query = query.eq('status', params.status)

  const { data: projects } = await query

  const statuses: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'cancelled']

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects?.length ?? 0} projects</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="size-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Link href="/projects" className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${!params.status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
          All
        </Link>
        {statuses.map(s => (
          <Link key={s} href={`/projects?status=${s}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${params.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {projects && projects.length > 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PM</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium hover:text-primary">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <Link href={`/clients/${p.client_id}`} className="hover:text-foreground">
                      {(p.clients as any)?.company_name ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status as ProjectStatus] ?? ''}`}>
                      {STATUS_LABEL[p.status as ProjectStatus] ?? p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {(p.staff as any)?.full_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen className="size-5" />}
          title="No projects yet"
          description="Create your first project to get started."
          action={
            <Link href="/projects/new">
              <Button><Plus className="size-4" />New project</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
