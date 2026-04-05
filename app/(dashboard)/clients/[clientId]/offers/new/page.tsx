import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OfferForm } from '@/components/offers/offer-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewOfferPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/clients/${clientId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">New offer</h1>
          {client && <p className="text-sm text-muted-foreground">{client.company_name}</p>}
        </div>
      </div>
      <OfferForm defaultClientId={clientId} />
    </div>
  )
}
