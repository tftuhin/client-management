'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderOpen, MessageSquare, Star, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const PORTAL_NAV = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/portal/project', label: 'My Project', icon: FolderOpen, exact: false },
  { href: '/portal/messages', label: 'Messages', icon: MessageSquare, exact: false },
  { href: '/portal/reviews', label: 'Reviews', icon: Star, exact: false },
]

interface PortalSidebarProps {
  clientName?: string
  companyName?: string
  initials?: string
}

export function PortalSidebar({
  clientName,
  companyName,
  initials = 'C',
}: PortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Failed to sign out')
    } else {
      router.push('/login')
    }
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
          Z
        </div>
        <span className="font-semibold text-sm truncate">Client Portal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="flex flex-col gap-0.5">
          {PORTAL_NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 pt-3 border-t">
          <span className="mx-2.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Client
          </span>
        </div>
      </nav>

      {/* User */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{clientName}</p>
            <p className="text-xs text-muted-foreground truncate">{companyName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
