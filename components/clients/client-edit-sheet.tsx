'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ClientForm } from './client-form'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

export function ClientEditSheet({ client, children }: { client: Client; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {children}
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit client</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ClientForm client={client} onSuccess={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
