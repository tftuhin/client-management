import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OfferForm } from '@/components/offers/offer-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewOfferPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('is_archived', false)
    .order('company_name')

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/offers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">New offer</h1>
      </div>
      <OfferForm clients={clients ?? []} />
    </div>
  )
}
