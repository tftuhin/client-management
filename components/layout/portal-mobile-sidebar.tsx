'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { PortalSidebar } from './portal-sidebar'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface PortalMobileSidebarProps {
  clientName?: string
  companyName?: string
  initials?: string
}

export function PortalMobileSidebar(props: PortalMobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md h-9 w-9 mr-1">
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-56 flex border-r-0">
        <SheetTitle className="sr-only">Portal Navigation Menu</SheetTitle>
        <PortalSidebar {...props} />
      </SheetContent>
    </Sheet>
  )
}
