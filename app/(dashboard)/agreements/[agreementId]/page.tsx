import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { AgreementActions } from '@/components/agreements/agreement-actions'
import { EditableAgreementContent } from '@/components/agreements/editable-agreement-content'
import { AgreementChangelog } from '@/components/agreements/agreement-changelog'

export default async function AgreementDetailPage({
  params,
}: {
  params: Promise<{ agreementId: string }>
}) {
  const { agreementId } = await params
  const supabase = await createClient()

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*, clients(id, company_name, contact_name, contact_email)')
    .eq('id', agreementId)
    .single()

  if (!agreement) notFound()

  const client = agreement.clients as any

  // Fetch all versions of this agreement
  const { data: allVersions } = await supabase
    .from('agreements')
    .select('*')
    .or(`id.eq.${agreementId},parent_id.eq.${agreement.parent_id || agreementId}`)
    .order('version', { ascending: false })

  // Fetch change requests
  const { data: changeRequests } = await supabase
    .from('agreement_change_requests')
    .select(`
      *,
      requested_by_staff:staff!agreement_change_requests_requested_by_fkey(full_name, email),
      reviewed_by_staff:staff!agreement_change_requests_reviewed_by_fkey(full_name, email)
    `)
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agreements" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{agreement.title}</h1>
            <Link href={`/clients/${client?.id}`} className="text-sm text-muted-foreground hover:text-foreground">
              {client?.company_name}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge type="agreement" value={agreement.status} />
            <AgreementActions agreement={agreement} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Meta */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Client</dt>
                  <dd>{client?.company_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Contact</dt>
                  <dd>{client?.contact_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd><StatusBadge type="agreement" value={agreement.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Version</dt>
                  <dd>v{agreement.version}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd>{formatDate(agreement.created_at)}</dd>
                </div>
                {agreement.sent_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Sent</dt>
                    <dd>{formatDateTime(agreement.sent_at)}</dd>
                  </div>
                )}
                {agreement.viewed_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Viewed</dt>
                    <dd>{formatDateTime(agreement.viewed_at)}</dd>
                  </div>
                )}
                {agreement.signed_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Client signed</dt>
                    <dd>{formatDateTime(agreement.signed_at)}</dd>
                    <dd className="text-xs text-muted-foreground">— {agreement.client_signature_name}</dd>
                  </div>
                )}
                {agreement.firm_signed_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Firm signed</dt>
                    <dd>{formatDateTime(agreement.firm_signed_at)}</dd>
                  </div>
                )}
                {agreement.expires_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Expires</dt>
                    <dd>{formatDateTime(agreement.expires_at)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Agreement content</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <EditableAgreementContent agreement={agreement} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Requests */}
      {changeRequests && changeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Change Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {changeRequests.map((request: any) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        request.status === 'pending' ? 'secondary' :
                        request.status === 'approved' ? 'default' :
                        request.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {request.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {request.requested_by_type === 'staff' ? 'Staff' : 'Client'} • {formatDateTime(request.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mb-2">{request.change_reason}</p>
                  {request.reviewed_at && (
                    <div className="text-xs text-muted-foreground">
                      Reviewed by {request.reviewed_by_staff?.full_name || 'Unknown'} on {formatDateTime(request.reviewed_at)}
                    </div>
                  )}
                  {request.review_notes && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Review notes:</p>
                      <p className="text-xs whitespace-pre-wrap">{request.review_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changelog */}
      {allVersions && allVersions.length > 0 && (
        <AgreementChangelog agreement={agreement} allVersions={allVersions} />
      )}
    </div>
  )
}
