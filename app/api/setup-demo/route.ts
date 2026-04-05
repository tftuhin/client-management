import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const DEMO_EMAIL = 'demo@webfirm.dev'
const DEMO_PASSWORD = 'demo1234'
const DEMO_NAME = 'Demo User'

// Only available in development
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createServiceClient()

  // Check if demo user already exists
  const { data: existing } = await supabase.auth.admin.listUsers()
  const alreadyExists = existing?.users?.some(u => u.email === DEMO_EMAIL)

  if (alreadyExists) {
    return NextResponse.json({ ok: true, created: false, message: 'Demo user already exists' })
  }

  // Create the demo user
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEMO_NAME },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Upsert staff row (the DB trigger may have already created it)
  await supabase.from('staff').upsert({
    id: data.user.id,
    full_name: DEMO_NAME,
    email: DEMO_EMAIL,
    role: 'owner',
    is_active: true,
  }, { onConflict: 'id' })

  return NextResponse.json({ ok: true, created: true, message: 'Demo user created' })
}
