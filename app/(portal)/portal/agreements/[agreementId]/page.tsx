import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { PortalAgreementDetail } from '@/components/agreements/portal-agreement-detail'

export default async function PortalAgreementDetailPage({ params }: { params: Promise<{ agreementId: string }> }) {
  const { agreementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const clientId: string | undefined = user.user_metadata?.client_id
  if (!clientId) notFound()

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', agreementId)
    .eq('client_id', clientId)
    .single()

  if (!agreement) notFound()

  const { data: changeRequests } = await supabase
    .from('agreement_change_requests')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/agreements" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{agreement.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Agreement details and action steps.</p>
        </div>
        <StatusBadge type="agreement" value={agreement.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Agreement info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd><StatusBadge type="agreement" value={agreement.status} /></dd>
              </div>
              {agreement.sent_at && (
                <div>
                  <dt className="text-xs text-muted-foreground">Sent</dt>
                  <dd>{formatDateTime(agreement.sent_at)}</dd>
                </div>
              )}
              {agreement.signed_at && (
                <div>
                  <dt className="text-xs text-muted-foreground">Signed</dt>
                  <dd>{formatDateTime(agreement.signed_at)}</dd>
                </div>
              )}
              {agreement.expires_at && (
                <div>
                  <dt className="text-xs text-muted-foreground">Expires</dt>
                  <dd>{formatDateTime(agreement.expires_at)}</dd>
                </div>
              )}
              {agreement.change_requested && (
                <div>
                  <dt className="text-xs text-muted-foreground">Change request</dt>
                  <dd className="whitespace-pre-wrap">{agreement.change_reason ?? 'The firm has received a request for updates.'}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agreement content</CardTitle>
          </CardHeader>
          <CardContent>
            <PortalAgreementDetail agreement={agreement} changeRequests={changeRequests || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
