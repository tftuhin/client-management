import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAIL = 'demo@webfirm.dev'
const DEMO_PASSWORD = 'demo1234'
const DEMO_NAME = 'Demo User'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: `Missing env vars: ${!url ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`.trim() },
      { status: 500 }
    )
  }

  // Use plain supabase-js client — auth.admin requires service role, not SSR wrapper
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find existing user
  const { data: list, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: `listUsers: ${listError.message}` }, { status: 500 })
  }

  const existing = list.users.find(u => u.email === DEMO_EMAIL)

  let userId: string

  if (existing) {
    // Reset password + confirm email every time so credentials are always valid
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      { password: DEMO_PASSWORD, email_confirm: true }
    )
    if (updateError) {
      return NextResponse.json({ error: `updateUser: ${updateError.message}` }, { status: 500 })
    }
    userId = updated.user.id
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    })
    if (createError) {
      return NextResponse.json({ error: `createUser: ${createError.message}` }, { status: 500 })
    }
    userId = created.user.id
  }

  // Ensure staff row exists
  const { error: staffError } = await supabase.from('staff').upsert(
    { id: userId, full_name: DEMO_NAME, email: DEMO_EMAIL, role: 'owner', is_active: true },
    { onConflict: 'id' }
  )
  if (staffError) {
    // Non-fatal — the DB trigger may have already created it
    console.warn('Staff upsert warning:', staffError.message)
  }

  return NextResponse.json({ ok: true })
}
