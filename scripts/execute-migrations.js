#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load env from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && key.trim()) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const migrations = [
  '008_agreement_change_history.sql',
  '009_fix_invoice_generation.sql',
  '010_fix_firm_settings_rls.sql',
  '011_fix_invoice_trigger_final.sql'
];

async function executeSql(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'Apikey': supabaseKey,
      },
      body: JSON.stringify({ sql }),
    });

    // Handle various response types
    if (response.ok) return { success: true };
    
    const text = await response.text();
    if (response.status === 404) {
      return { success: false, error: 'exec_sql function not found - trying direct execution' };
    }
    
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Authentication failed' };
    }
    
    return { success: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function applyMigrations() {
  console.log('\n🚀 Applying migrations to Supabase...\n');
  
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  let successCount = 0;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${migration} - File not found`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📝 Applying ${migration}...`);
    const result = await executeSql(sql);
    
    if (result.success) {
      console.log(`✅ ${migration} - Applied successfully\n`);
      successCount++;
    } else {
      console.log(`⚠️  ${migration} - ${result.error}`);
      console.log(`   Please apply manually via Supabase SQL Editor\n`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 Results: ${successCount}/${migrations.length} migrations applied`);
  
  if (successCount < migrations.length) {
    console.log('\n📋 For remaining migrations, please:');
    console.log('   1. Open: https://app.supabase.com/project/umnodfksyaokdsgayfmw/sql');
    console.log('   2. Create new queries and paste SQL from:');
    migrations.forEach(m => console.log(`      - supabase/migrations/${m}`));
    console.log('   3. Run each query');
  } else {
    console.log('\n✨ All migrations applied successfully!');
    console.log('   Your application is now fully updated.');
  }
  console.log(`${'═'.repeat(60)}\n`);
}

applyMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
