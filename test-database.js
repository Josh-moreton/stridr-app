// Test database connectivity and table structure
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

async function testDatabase() {
  console.log('Testing database connectivity...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Authenticate first
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });

  if (authError) {
    console.error('❌ Auth error:', authError);
    return;
  }

  console.log('✅ Authentication successful');
  
  // Test if user_training_plans table exists
  console.log('\nTesting user_training_plans table...');
  const { data: plansData, error: plansError } = await supabase
    .from('user_training_plans')
    .select('*')
    .limit(1);
    
  if (plansError) {
    console.error('❌ Error accessing user_training_plans:', plansError);
  } else {
    console.log('✅ user_training_plans table accessible');
    console.log('Sample data:', plansData);
  }

  // Test if plan_weekly_schedules table exists
  console.log('\nTesting plan_weekly_schedules table...');
  const { data: schedData, error: schedError } = await supabase
    .from('plan_weekly_schedules')
    .select('*')
    .limit(1);
    
  if (schedError) {
    console.error('❌ Error accessing plan_weekly_schedules:', schedError);
  } else {
    console.log('✅ plan_weekly_schedules table accessible');
    console.log('Sample data:', schedData);
  }

  // Test if plan_scheduled_runs table exists
  console.log('\nTesting plan_scheduled_runs table...');
  const { data: runsData, error: runsError } = await supabase
    .from('plan_scheduled_runs')
    .select('*')
    .limit(1);
    
  if (runsError) {
    console.error('❌ Error accessing plan_scheduled_runs:', runsError);
  } else {
    console.log('✅ plan_scheduled_runs table accessible');
    console.log('Sample data:', runsData);
  }
}

testDatabase().catch(console.error);
