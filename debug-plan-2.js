// Quick test to see the actual error from training plan generation
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

async function testPlanGeneration() {
  console.log('Testing direct Supabase authentication...');
  
  // Use Supabase client directly for authentication
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });

  if (error) {
    console.error('Auth error:', error);
    return;
  }

  console.log('✅ Authentication successful');
  console.log('Access token:', data.session.access_token.substring(0, 50) + '...');
  
  // Test plan generation with detailed error logging
  console.log('\nTesting plan generation...');
  const planResponse = await fetch(`${process.env.BASE_URL}/api/training-plan/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      raceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      raceName: 'Test Marathon',
      raceDistance: 42195,
      trainingPaces: {
        easy: { minPerKm: 5400000, maxPerKm: 6000000 },
        marathon: { minPerKm: 4800000, maxPerKm: 4800000 }
      },
      weeklyMileage: 50,
      peakWeeklyMileage: 70,
      trainingDays: 5,
      longRunDay: 'Sunday',
      longRunMaxDistance: 32000,
      buildUpWeeks: 12,
      taperWeeks: 3,
      recoveryWeeks: [4, 8]
    }),
  });

  console.log('Plan generation status:', planResponse.status);
  const planData = await planResponse.json();
  console.log('Plan generation response:', JSON.stringify(planData, null, 2));
}

testPlanGeneration().catch(console.error);
