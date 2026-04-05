import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const DEMO_EMAIL = 'demo@webfirm.dev'
const DEMO_PASSWORD = 'demo1234'
const DEMO_NAME = 'Demo User'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local' },
      { status: 500 }
    )
  }

  const supabase = await createServiceClient()

  // Find existing user by email
  const { data: list, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const existing = list?.users?.find(u => u.email === DEMO_EMAIL)

  let userId: string

  if (existing) {
    // Always reset password and confirm email so credentials are always valid
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DEMO_NAME },
      }
    )
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    userId = updated.user.id
  } else {
    // Create fresh
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    })
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
    userId = created.user.id
  }

  // Ensure staff row exists with owner role
  await supabase.from('staff').upsert(
    { id: userId, full_name: DEMO_NAME, email: DEMO_EMAIL, role: 'owner', is_active: true },
    { onConflict: 'id' }
  )

  return NextResponse.json({ ok: true })
}
