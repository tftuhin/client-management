'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ProjectForm } from './project-form'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']
type Staff = Pick<Database['public']['Tables']['staff']['Row'], 'id' | 'full_name'>

interface ProjectEditSheetProps {
  project: Project
  staff: Staff[]
  children: React.ReactNode
}

export function ProjectEditSheet({ project, staff, children }: ProjectEditSheetProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">{children}</span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit project</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ProjectForm project={project} staff={staff} onSuccess={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
