import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; project?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: clients }, { data: projects }, { data: agreements }] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('is_archived', false).order('company_name'),
    params.client
      ? supabase.from('projects').select('id, name').eq('client_id', params.client).order('name')
      : supabase.from('projects').select('id, name').order('name'),
    params.project
      ? supabase.from('agreements').select('id, title, status').eq('project_id', params.project).order('created_at', { ascending: false })
      : { data: [] },
  ])

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={params.project ? `/projects/${params.project}` : '/invoices'} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">New invoice</h1>
      </div>
      <InvoiceForm
        clients={clients ?? []}
        projects={projects ?? []}
        agreements={agreements ?? []}
        defaultClientId={params.client}
        defaultProjectId={params.project}
      />
    </div>
  )
}
