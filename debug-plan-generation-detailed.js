const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

async function debugPlanGeneration() {
  console.log('🔍 Starting detailed plan generation debug...');
  console.log('Environment check:');
  console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('- SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ Missing');
  
  // Create service role client to debug database operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Authenticate test user
    console.log('\n📋 Test 1: Authenticating test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    });

    if (authError) {
      console.error('❌ Auth failed:', authError);
      return;
    }

    console.log('✅ Authentication successful');
    const userId = authData.user.id;
    console.log('User ID:', userId);

    // Test 2: Check database table schemas
    console.log('\n📋 Test 2: Checking database table schemas...');
    
    // Check user_training_plans table
    const { data: planSchema, error: planSchemaError } = await supabase
      .from('user_training_plans')
      .select('*')
      .limit(1);
    
    if (planSchemaError) {
      console.error('❌ user_training_plans table error:', planSchemaError);
    } else {
      console.log('✅ user_training_plans table accessible');
    }

    // Check plan_weekly_schedules table
    const { data: weekSchema, error: weekSchemaError } = await supabase
      .from('plan_weekly_schedules')
      .select('*')
      .limit(1);
    
    if (weekSchemaError) {
      console.error('❌ plan_weekly_schedules table error:', weekSchemaError);
    } else {
      console.log('✅ plan_weekly_schedules table accessible');
    }

    // Check plan_scheduled_runs table
    const { data: runSchema, error: runSchemaError } = await supabase
      .from('plan_scheduled_runs')
      .select('*')
      .limit(1);
    
    if (runSchemaError) {
      console.error('❌ plan_scheduled_runs table error:', runSchemaError);
    } else {
      console.log('✅ plan_scheduled_runs table accessible');
    }

    // Test 3: Generate minimal plan data
    console.log('\n📋 Test 3: Testing minimal plan insertion...');
    
    const minimalPlan = {
      user_id: userId,
      plan_name: 'Debug Test Plan',
      race_distance: 'marathon',
      race_date: '2025-10-01',
      training_paces: {
        easy: { minPerKm: 5000, maxPerKm: 5500 },
        tempo: { minPerKm: 4200, maxPerKm: 4400 }
      },
      total_weeks: 16,
      plan_start_date: '2025-06-01',
      plan_end_date: '2025-09-28'
    };

    console.log('Attempting to insert minimal plan:', JSON.stringify(minimalPlan, null, 2));

    const { data: savedPlan, error: planError } = await supabase
      .from('user_training_plans')
      .insert(minimalPlan)
      .select()
      .single();

    if (planError) {
      console.error('❌ Plan insertion failed:', planError);
      console.error('Error details:', JSON.stringify(planError, null, 2));
      return;
    }

    console.log('✅ Plan inserted successfully');
    console.log('Plan ID:', savedPlan.id);

    // Test 4: Test weekly schedule insertion
    console.log('\n📋 Test 4: Testing weekly schedule insertion...');
    
    const minimalWeek = {
      training_plan_id: savedPlan.id,
      week_number: 1,
      start_date: '2025-06-01',
      end_date: '2025-06-07',
      summary: 'Base building week'
    };

    const { data: savedWeek, error: weekError } = await supabase
      .from('plan_weekly_schedules')
      .insert(minimalWeek)
      .select()
      .single();

    if (weekError) {
      console.error('❌ Week insertion failed:', weekError);
      console.error('Error details:', JSON.stringify(weekError, null, 2));
      return;
    }

    console.log('✅ Week inserted successfully');
    console.log('Week ID:', savedWeek.id);

    // Test 5: Test run insertion
    console.log('\n📋 Test 5: Testing run insertion...');
    
    const minimalRun = {
      weekly_schedule_id: savedWeek.id,
      training_plan_id: savedPlan.id,
      user_id: userId,
      run_date: '2025-06-01',
      day_of_week: 'Sunday',
      run_type: 'Easy',
      description: 'Easy base run',
      total_duration_seconds: 3600,
      total_distance_meters: 8000,
      workout_steps: null,
      notes: 'Test run'
    };

    const { data: savedRun, error: runError } = await supabase
      .from('plan_scheduled_runs')
      .insert(minimalRun)
      .select()
      .single();

    if (runError) {
      console.error('❌ Run insertion failed:', runError);
      console.error('Error details:', JSON.stringify(runError, null, 2));
      return;
    }

    console.log('✅ Run inserted successfully');
    console.log('Run ID:', savedRun.id);

    // Cleanup
    console.log('\n📋 Cleaning up test data...');
    await supabase.from('plan_scheduled_runs').delete().eq('id', savedRun.id);
    await supabase.from('plan_weekly_schedules').delete().eq('id', savedWeek.id);
    await supabase.from('user_training_plans').delete().eq('id', savedPlan.id);
    console.log('✅ Cleanup completed');

    console.log('\n🎉 All database operations working correctly!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugPlanGeneration().catch(console.error);
