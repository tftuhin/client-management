'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  FileText,
  Receipt,
  FolderOpen,
  Lightbulb,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { isAdmin } from '@/lib/permissions'
import type { StaffRole } from '@/types/database'

// Nav items visible to all staff
const STAFF_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban, exact: false },
  { href: '/clients', label: 'Clients', icon: Users, exact: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, exact: false },
  { href: '/agreements', label: 'Agreements', icon: FileText, exact: false },
  { href: '/invoices', label: 'Invoices', icon: Receipt, exact: false },
  { href: '/offers', label: 'Offers', icon: Lightbulb, exact: false },
]

interface SidebarProps {
  firmName?: string
  userEmail?: string
  userInitials?: string
  role?: StaffRole
}

export function Sidebar({
  firmName = 'Zeon CRM',
  userEmail,
  userInitials = 'U',
  role = 'member',
}: SidebarProps) {
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

  const admin = isAdmin(role)

  return (
    <aside className="flex h-screen sticky top-0 w-56 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
          Z
        </div>
        <span className="font-semibold text-sm truncate">{firmName}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="flex flex-col gap-0.5">
          {STAFF_NAV.map(({ href, label, icon: Icon, exact }) => {
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

        {/* Settings — only visible to admins */}
        {admin && (
          <div className="mt-4 pt-4 border-t">
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Settings className="size-4 shrink-0" />
              Settings
            </Link>
          </div>
        )}

        {/* Role badge */}
        <div className="mt-4 pt-3 border-t">
          <span className={cn(
            'mx-2.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            admin
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}>
            {admin ? 'Admin' : 'Project Manager'}
          </span>
        </div>
      </nav>

      {/* User */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
            {userInitials}
          </div>
          <span className="flex-1 truncate text-xs text-muted-foreground">{userEmail}</span>
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
