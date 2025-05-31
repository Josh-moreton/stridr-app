const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('🔍 Checking plan_scheduled_runs table schema...');

  // Try to get the schema by attempting a select with limit 0
  const { data, error } = await supabase
    .from('plan_scheduled_runs')
    .select('*')
    .limit(1);

  console.log('Schema check result:');
  console.log('Error:', error);
  console.log('Sample data structure:', data);

  // Also check if the table has required relationships
  const { data: sample, error: sampleError } = await supabase
    .from('plan_scheduled_runs')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('\nSample record structure:');
    console.log(JSON.stringify(sample[0], null, 2));
  } else {
    console.log('\nNo existing records found.');
  }

  // Check table info (if you have access)
  console.log('\n🔍 Checking table constraints...');
  const { data: tableInfo, error: tableError } = await supabase
    .rpc('get_table_info', { table_name: 'plan_scheduled_runs' })
    .single();

  if (tableError) {
    console.log('Table info not available (this is normal):', tableError.message);
  } else {
    console.log('Table info:', tableInfo);
  }
}

checkSchema().catch(console.error);