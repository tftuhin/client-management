'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { Database } from '@/types/database'

type Agreement = Database['public']['Tables']['agreements']['Row']

interface AgreementChangelogProps {
  agreement: Agreement
  allVersions: Agreement[]
}

export function AgreementChangelog({ agreement, allVersions }: AgreementChangelogProps) {
  // Sort by version descending (newest first)
  const sortedVersions = [...allVersions].sort((a, b) => b.version - a.version)

  if (sortedVersions.length <= 1) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedVersions.map((version, index) => {
            const isPreviousVersion = version.id !== agreement.id
            const statusLabel = (() => {
              if (version.signed_at) return 'Signed'
              if (version.viewed_at) return 'Viewed'
              if (version.sent_at) return 'Sent'
              return 'Draft'
            })()

            return (
              <div
                key={version.id}
                className="pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">v{version.version}</span>
                    <Badge variant={isPreviousVersion ? 'outline' : 'default'}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isPreviousVersion ? 'Previous version' : 'Current version'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Created: {formatDateTime(version.created_at)}</p>
                  {version.sent_at && <p>Sent: {formatDateTime(version.sent_at)}</p>}
                  {version.viewed_at && <p>Viewed: {formatDateTime(version.viewed_at)}</p>}
                  {version.signed_at && (
                    <>
                      <p>Client signed: {formatDateTime(version.signed_at)}</p>
                      {version.client_signature_name && (
                        <p>Signed by: {version.client_signature_name}</p>
                      )}
                    </>
                  )}
                  {version.firm_signed_at && <p>Firm signed: {formatDateTime(version.firm_signed_at)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
