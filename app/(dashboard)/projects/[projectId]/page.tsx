import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, FileText, Receipt, AlertTriangle } from 'lucide-react'
import { ProjectStatusActions } from '@/components/projects/project-status-actions'
import { ProjectEditSheet } from '@/components/projects/project-edit-sheet'
import type { ProjectStatus } from '@/types/database'

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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const [
    { data: project },
    { data: agreements },
    { data: invoices },
    { data: staff },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*, clients(id, company_name), staff_member:assigned_to(full_name)')
      .eq('id', projectId)
      .single(),
    supabase
      .from('agreements')
      .select('id, title, status, created_at, signed_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, total, due_date')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase.from('staff').select('id, full_name').eq('is_active', true).order('full_name'),
  ])

  if (!project) notFound()

  const signedAgreement = agreements?.find(a => a.status === 'signed')
  const hasSignedAgreement = !!signedAgreement
  const totalInvoiced = (invoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/projects" className="mt-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-semibold">{project.name}</h1>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[project.status as ProjectStatus]}`}>
                {STATUS_LABEL[project.status as ProjectStatus] ?? project.status}
              </span>
            </div>
            <Link href={`/clients/${(project.clients as any)?.id}`} className="text-sm text-muted-foreground hover:text-foreground">
              {(project.clients as any)?.company_name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProjectStatusActions
            projectId={project.id}
            status={project.status as ProjectStatus}
            hasSignedAgreement={hasSignedAgreement}
          />
          <ProjectEditSheet project={project} staff={staff ?? []}>
            <Button variant="outline" size="sm">Edit</Button>
          </ProjectEditSheet>
        </div>
      </div>

      {/* Agreement gate warning */}
      {project.status === 'planning' && !hasSignedAgreement && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Agreement required to activate</p>
            <p className="text-amber-700 mt-0.5">
              Create and get a signed agreement before this project can go active.{' '}
              <Link href={`/agreements/new?project=${projectId}&client=${(project.clients as any)?.id}`} className="underline underline-offset-2 hover:text-amber-900">
                Create agreement
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Total invoiced</p>
            <p className="text-lg font-semibold">{formatCurrency(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Agreements</p>
            <p className="text-lg font-semibold">{agreements?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Assigned PM</p>
            <p className="text-sm font-medium truncate">{(project.staff_member as any)?.full_name ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {project.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agreements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agreements</CardTitle>
              <Link href={`/agreements/new?project=${projectId}&client=${(project.clients as any)?.id}`}>
                <Button size="xs" variant="outline">
                  <FileText className="size-3" />
                  New
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {agreements && agreements.length > 0 ? (
              <div className="divide-y">
                {agreements.map(ag => (
                  <Link key={ag.id} href={`/agreements/${ag.id}`}
                    className="flex items-center justify-between py-2.5 hover:text-primary transition-colors">
                    <div>
                      <p className="text-sm font-medium">{ag.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ag.signed_at ? `Signed ${formatDate(ag.signed_at)}` : `Created ${formatDate(ag.created_at)}`}
                      </p>
                    </div>
                    <StatusBadge type="agreement" value={ag.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="size-4" />}
                title="No agreements"
                description="Create one to unlock project activation."
              />
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <Link href={`/invoices/new?project=${projectId}&client=${(project.clients as any)?.id}`}>
                <Button size="xs" variant="outline">
                  <Receipt className="size-3" />
                  New
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {invoices && invoices.length > 0 ? (
              <div className="divide-y">
                {invoices.map(inv => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between py-2.5 hover:text-primary transition-colors">
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number} — {inv.title}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                      <StatusBadge type="invoice" value={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Receipt className="size-4" />}
                title="No invoices"
                description="Tag invoices to this project."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
