import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

export default async function PortalAgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const clientId: string | undefined = user.user_metadata?.client_id
  if (!clientId) return null

  const { data: agreements } = await supabase
    .from('agreements')
    .select('id, title, status, sent_at, signed_at, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Agreements</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View contracts and ask for revisions directly from your portal.</p>
      </div>

      {agreements && agreements.length > 0 ? (
        <div className="grid gap-4">
          {agreements.map(agreement => (
            <Card key={agreement.id}>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  <Link href={`/portal/agreements/${agreement.id}`} className="block hover:text-primary">
                    {agreement.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{formatDate(agreement.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge type="agreement" value={agreement.status} />
                    {agreement.signed_at && <span>Signed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No agreements yet"
          description="Your agreements will appear here once the firm sends them to you."
        />
      )}
    </div>
  )
}
