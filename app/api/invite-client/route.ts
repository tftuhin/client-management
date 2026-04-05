import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Authenticate the caller (must be staff)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is staff
  const { data: staff } = await supabase.from('staff').select('id, role').eq('id', user.id).single()
  if (!staff) return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })

  const { clientId, email, redirectTo } = await req.json()
  if (!clientId || !email) {
    return NextResponse.json({ error: 'clientId and email are required' }, { status: 400 })
  }

  // Verify the client record exists and get its name
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, company_name, auth_user_id')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Admin SDK — need service role key
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration: missing service role key' }, { status: 500 })
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Send invitation email via Supabase Auth
  const origin = req.nextUrl.origin
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      user_type: 'client',
      client_id: clientId,
    },
    redirectTo: redirectTo ?? `${origin}/portal`,
  })

  if (inviteError) {
    // If user already exists, resend the invite by generating a magic link
    if (inviteError.message.toLowerCase().includes('already been registered')) {
      // Find the existing user and update their metadata
      const { data: existingUsers } = await admin.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(u => u.email === email)
      if (existingUser) {
        await admin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { user_type: 'client', client_id: clientId },
        })
        if (!client.auth_user_id) {
          await admin.from('clients').update({ auth_user_id: existingUser.id }).eq('id', clientId)
        }
        await admin.from('client_portal_users').upsert(
          { client_id: clientId, auth_user_id: existingUser.id },
          { onConflict: 'auth_user_id' }
        )
        // Log the invitation
        await admin.from('client_invitations').upsert(
          { client_id: clientId, invited_by: user.id, email, status: 'accepted', accepted_at: new Date().toISOString() },
          { onConflict: 'client_id' }
        )
        return NextResponse.json({ ok: true, note: 'Existing user linked to client' })
      }
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  if (inviteData?.user) {
    if (!client.auth_user_id) {
      await admin.from('clients')
        .update({ auth_user_id: inviteData.user.id })
        .eq('id', clientId)
    }

    await admin.from('client_portal_users').upsert(
      { client_id: clientId, auth_user_id: inviteData.user.id },
      { onConflict: 'auth_user_id' }
    )

    await admin.from('client_invitations').insert({
      client_id: clientId,
      invited_by: user.id,
      email,
      status: 'pending',
    })
  }

  return NextResponse.json({ ok: true })
}
