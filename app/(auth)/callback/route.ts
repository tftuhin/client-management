import { createServerClient } from '@supabase/ssr'
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

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
