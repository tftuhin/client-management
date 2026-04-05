import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AgreementForm } from '@/components/agreements/agreement-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; project?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: clients }, { data: templates }, { data: projects }] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('is_archived', false).order('company_name'),
    supabase.from('agreement_templates').select('*').order('name'),
    params.client
      ? supabase.from('projects').select('id, name').eq('client_id', params.client).order('name')
      : supabase.from('projects').select('id, name').order('name'),
  ])

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={params.project ? `/projects/${params.project}` : '/agreements'} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">New agreement</h1>
      </div>
      <AgreementForm
        clients={clients ?? []}
        templates={templates ?? []}
        projects={projects ?? []}
        defaultClientId={params.client}
        defaultProjectId={params.project}
      />
    </div>
  )
}
