import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && user) {
      // Determine redirect based on user type
      const userType = user.user_metadata?.user_type
      const clientId = user.user_metadata?.client_id

      if (userType === 'client' && clientId) {
        // Ensure client record is linked to this auth user (idempotent)
        await supabase
          .from('clients')
          .update({ auth_user_id: user.id })
          .eq('id', clientId)
          .is('auth_user_id', null) // only set if not already linked

        // Mark invitation as accepted
        await supabase
          .from('client_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .eq('status', 'pending')

        return NextResponse.redirect(`${origin}/portal`)
      }

      if (userType === 'staff') {
        const invitedRole = user.user_metadata?.invited_role ?? 'member'
        const fullName = user.user_metadata?.full_name ?? (user.email?.split('@')[0] ?? 'Team Member')
        // Use service role to bypass RLS staff_insert_admin policy
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (url && serviceKey) {
          const adminClient = createSupabaseClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          await adminClient.from('staff').upsert(
            {
              id: user.id,
              full_name: fullName,
              email: user.email ?? '',
              role: invitedRole,
              is_active: true,
            },
            { onConflict: 'id' }
          )
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
