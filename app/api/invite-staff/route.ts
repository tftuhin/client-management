import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staffRow } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!staffRow || !isAdmin(staffRow.role)) {
    return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
  }

  const { email, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const invitedRole = ['admin', 'project_manager', 'member'].includes(role) ? role : 'project_manager'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const origin = req.nextUrl.origin
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      user_type: 'staff',
      invited_role: invitedRole,
    },
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
  })

  if (error) {
    // If already registered, just update their metadata
    if (error.message.toLowerCase().includes('already been registered')) {
      const { data: users } = await admin.auth.admin.listUsers()
      const existing = users?.users.find(u => u.email === email)
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, {
          user_metadata: { user_type: 'staff', invited_role: invitedRole },
        })
        // Ensure staff record exists
        await admin.from('staff').upsert(
          {
            id: existing.id,
            full_name: existing.user_metadata?.full_name ?? email.split('@')[0],
            email,
            role: invitedRole,
            is_active: true,
          },
          { onConflict: 'id' }
        )
        return NextResponse.json({ ok: true, note: 'Existing user updated' })
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
