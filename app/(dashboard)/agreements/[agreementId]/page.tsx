import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { AgreementActions } from '@/components/agreements/agreement-actions'

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
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {agreement.content}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
