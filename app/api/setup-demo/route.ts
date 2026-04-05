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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' }, { status: 500 })
  }
  if (!serviceKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local' }, { status: 500 })
  }

  // Step 1: try signing in with existing demo credentials — if it works, no admin calls needed
  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })
  if (!signInError) {
    // Credentials already valid — skip admin API entirely (no emails triggered)
    return NextResponse.json({ ok: true })
  }

  // Step 2: credentials don't work — use admin API to create/fix the user
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: list, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: `listUsers: ${listError.message}` }, { status: 500 })
  }

  const existing = list.users.find((u: any) => u.email === DEMO_EMAIL)
  let userId: string

  if (existing) {
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      { password: DEMO_PASSWORD, email_confirm: true }
    )
    if (updateError) {
      if (updateError.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json({
          error: 'Email rate limit hit. Fix: in Supabase dashboard go to Authentication → Providers → Email and turn off "Confirm email". Then try again.',
        }, { status: 429 })
      }
      return NextResponse.json({ error: `updateUser: ${updateError.message}` }, { status: 500 })
    }
    userId = updated.user.id
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    })
    if (createError) {
      if (createError.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json({
          error: 'Email rate limit hit. Fix: in Supabase dashboard go to Authentication → Providers → Email and turn off "Confirm email". Then try again.',
        }, { status: 429 })
      }
      return NextResponse.json({ error: `createUser: ${createError.message}` }, { status: 500 })
    }
    userId = created.user.id
  }

  // Ensure staff row exists
  await admin.from('staff').upsert(
    { id: userId, full_name: DEMO_NAME, email: DEMO_EMAIL, role: 'owner', is_active: true },
    { onConflict: 'id' }
  )

  return NextResponse.json({ ok: true })
}
