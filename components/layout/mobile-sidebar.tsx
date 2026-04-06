'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import type { StaffRole } from '@/types/database'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface MobileSidebarProps {
  firmName?: string
  userEmail?: string
  userInitials?: string
  role?: StaffRole
}

export function MobileSidebar(props: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile sidebar whenever the user navigates cleanly
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
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <Sidebar {...props} />
      </SheetContent>
    </Sheet>
  )
}
