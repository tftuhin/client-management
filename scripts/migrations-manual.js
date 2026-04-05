#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           📋 SUPABASE MIGRATIONS - MANUAL APPLICATION          ║
╚════════════════════════════════════════════════════════════════╝

The following migrations need to be applied to your Supabase database:

`);

const migrations = [
  '008_agreement_change_history.sql',
  '009_fix_invoice_generation.sql',
  '010_fix_firm_settings_rls.sql',
  '011_fix_invoice_trigger_final.sql'
];

const migrationsDir = path.join(process.cwd(), 'supabase/migrations');

console.log('📍 STEP 1: Open Supabase SQL Editor');
console.log('   🔗 https://app.supabase.com/project/umnodfksyaokdsgayfmw/sql\n');

console.log('📍 STEP 2: Apply migrations in order\n');

migrations.forEach((migration, idx) => {
  const filePath = path.join(migrationsDir, migration);
  console.log(`${idx + 1}. ${migration}`);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`   ✓ File found (${content.length} bytes)`);
    console.log(`   📄 Path: supabase/migrations/${migration}`);
  } else {
    console.log(`   ✗ File not found!`);
  }
  console.log('');
});

console.log('📍 STEP 3: For each migration:');
console.log('   1. Create a new query in SQL Editor');
console.log('   2. Copy and paste the entire SQL file content');
console.log('   3. Click "Run" button');
console.log('   4. Wait for success message\n');

console.log('📍 STEP 4: Verify migrations applied');
console.log('   After all migrations run, you should see:');
console.log('   ✓ agreement_change_requests table created');
console.log('   ✓ generate_invoice_number function updated');
console.log('   ✓ firm_settings RLS policies updated\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('⚡ After applying migrations, the following will work:');
console.log('   • Agreement change request history tracking');
console.log('   • Invoice number generation');
console.log('   • Client portal agreement change requests');
console.log('═══════════════════════════════════════════════════════════════\n');
