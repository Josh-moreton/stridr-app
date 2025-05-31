// Quick test to see the actual error from training plan generation
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.test' });

async function testAuth() {
  console.log('Testing authentication...');
  
  const authResponse = await fetch(`${process.env.BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    }),
  });

  const authData = await authResponse.json();
  console.log('Auth response:', authData);
  
  if (authData.session?.access_token) {
    console.log('✅ Got access token');
    
    // Test plan generation with detailed error logging
    console.log('\nTesting plan generation...');
    const planResponse = await fetch(`${process.env.BASE_URL}/api/training-plan/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
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
}

testAuth().catch(console.error);
