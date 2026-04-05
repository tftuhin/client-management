import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '@/components/projects/project-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: clients }, { data: staff }] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('is_archived', false).order('company_name'),
    supabase.from('staff').select('id, full_name').eq('is_active', true).order('full_name'),
  ])

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">New project</h1>
      </div>
      <ProjectForm
        clients={clients ?? []}
        staff={staff ?? []}
        defaultClientId={params.client}
      />
    </div>
  )
}
