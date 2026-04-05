#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment manually from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && !process.env[key]) {
      process.env[key] = value.join('=');
    }
  });
}

async function applyMigrations() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
      console.error(`   URL: ${supabaseUrl}`);
      console.error(`   Key: ${supabaseKey ? 'found' : 'not found'}`);
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    const pendingMigrations = [
      '008_agreement_change_history.sql',
      '009_fix_invoice_generation.sql',
      '010_fix_firm_settings_rls.sql',
      '011_fix_invoice_trigger_final.sql'
    ];

    console.log('🚀 Applying pending migrations to Supabase...\n');
    
    for (const migration of pendingMigrations) {
      const filePath = path.join(migrationsDir, migration);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${migration} (not found)`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        console.log(`📝 Applying ${migration}...`);
        
        // Execute SQL directly
        const { error } = await supabase.rpc('exec', {
          sql_query: sql
        }).catch(async () => {
          // Fallback: try executing via raw query
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ sql_query: sql }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          return { error: null };
        });

        if (error) {
          console.warn(`⚠️  ${migration} - ${error.message}`);
        } else {
          console.log(`✅ ${migration} applied successfully\n`);
        }
      } catch (err) {
        console.error(`\n❌ Error applying ${migration}:`);
        console.error(err.message);
        console.error(`\n📋 Please apply manually via Supabase SQL Editor`);
        console.error(`   URL: ${supabaseUrl}/editor`);
        console.error(`   File: ${filePath}\n`);
      }
    }
    
    console.log('✨ Migration process complete!');
    console.log('\n💡 Tip: If migrations failed, apply them manually via Supabase dashboard SQL editor');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

applyMigrations();
