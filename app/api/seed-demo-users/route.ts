/**
 * POST /api/seed-demo-users
 * Creates 3 demo accounts for testing:
 *   - pm@zeon.demo      (password: Demo1234!)  — Project Manager
 *   - client1@zeon.demo (password: Demo1234!)  — Client 1 (Acme Corp)
 *   - client2@zeon.demo (password: Demo1234!)  — Client 2 (Nova Labs)
 *
 * Requires: admin auth + SUPABASE_SERVICE_ROLE_KEY
 * Only intended for development / staging use.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'

const DEMO_PASSWORD = 'Demo1234!'

export async function POST(_req: NextRequest) {
  // Auth check — only admins can seed
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).single()
  if (!staffRow || !isAdmin(staffRow.role)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const results: Record<string, string> = {}

  // ── 1. PM user ───────────────────────────────────────────────
  const pmEmail = 'pm@zeon.demo'
  const { data: pmData, error: pmErr } = await admin.auth.admin.createUser({
    email: pmEmail,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Alex PM', user_type: 'staff', invited_role: 'project_manager' },
  })

  if (pmErr && !pmErr.message.includes('already been registered')) {
    return NextResponse.json({ error: `PM creation failed: ${pmErr.message}` }, { status: 500 })
  }

  const pmUserId = pmData?.user?.id
  if (pmUserId) {
    await admin.from('staff').upsert(
      { id: pmUserId, full_name: 'Alex PM', email: pmEmail, role: 'project_manager', is_active: true },
      { onConflict: 'id' }
    )
    results.pm = `${pmEmail} created`
  } else {
    results.pm = `${pmEmail} already exists`
  }

  // ── 2. Demo client records ───────────────────────────────────
  const clients = [
    { email: 'client1@zeon.demo', name: 'Jordan Client', company: 'Acme Corp', idx: 1 },
    { email: 'client2@zeon.demo', name: 'Taylor Client', company: 'Nova Labs', idx: 2 },
  ]

  for (const c of clients) {
    // Ensure client record exists
    const { data: clientRecord } = await admin
      .from('clients')
      .select('id, auth_user_id')
      .eq('contact_email', c.email)
      .maybeSingle()

    let clientId = clientRecord?.id

    if (!clientId) {
      const { data: newClient } = await admin
        .from('clients')
        .insert({
          company_name: c.company,
          contact_name: c.name,
          contact_email: c.email,
          pipeline_stage: 'active',
        })
        .select('id')
        .single()
      clientId = newClient?.id
    }

    if (!clientId) {
      results[`client${c.idx}`] = `Failed to create client record for ${c.email}`
      continue
    }

    // Create auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: c.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: c.name,
        user_type: 'client',
        client_id: clientId,
      },
    })

    if (authErr && !authErr.message.includes('already been registered')) {
      results[`client${c.idx}`] = `Auth creation failed: ${authErr.message}`
      continue
    }

    const authUserId = authData?.user?.id
    if (authUserId && !clientRecord?.auth_user_id) {
      await admin.from('clients').update({ auth_user_id: authUserId }).eq('id', clientId)
    }

    results[`client${c.idx}`] = `${c.email} (${c.company}) created`
  }

  return NextResponse.json({
    ok: true,
    credentials: { password: DEMO_PASSWORD },
    results,
  })
}
