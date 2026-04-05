#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const migrations = [
  '008_agreement_change_history.sql',
  '009_fix_invoice_generation.sql',
  '010_fix_firm_settings_rls.sql',
  '011_fix_invoice_trigger_final.sql'
];

const migrationsDir = path.join(process.cwd(), 'supabase/migrations');

console.log('\n📋 COPY-PASTE EACH MIGRATION TO SUPABASE SQL EDITOR\n');
console.log('🔗 Editor: https://app.supabase.com/project/umnodfksyaokdsgayfmw/sql\n');

migrations.forEach((migration, idx) => {
  const filePath = path.join(migrationsDir, migration);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${migration} - File not found\n`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`${'═'.repeat(70)}`);
  console.log(`📝 MIGRATION ${idx + 1}/4: ${migration}`);
  console.log(`${'═'.repeat(70)}`);
  console.log('');
  console.log(content);
  console.log('');
  console.log(`✂️  COPY THE SQL ABOVE ↑`);
  console.log(`   Then:`);
  console.log(`   1. Open SQL Editor (link above)`);
  console.log(`   2. Create new query`);
  console.log(`   3. Paste all the SQL above`);
  console.log(`   4. Click "Run"`);
  console.log(`   5. Wait for success message`);
  console.log(`   6. Then proceed to migration ${idx + 2}/4`);
  console.log('');
  console.log('');
});

console.log(`${'═'.repeat(70)}`);
console.log('✨ After applying all 4 migrations:');
console.log('   • Agreement change request history will work');
console.log('   • Invoice generation will work');
console.log('   • Client portal features will be enabled');
console.log(`${'═'.repeat(70)}\n`);
