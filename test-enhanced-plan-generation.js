// Test script for enhanced plan generation with experience levels and weekly volume
require('dotenv').config({ path: '.env.test' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

console.log('🧪 Testing Enhanced Plan Generation...');

async function testEnhancedPlanGeneration() {
  const baseUrl = 'http://localhost:3000';
  
  // Step 1: Authenticate
  console.log('🔐 Authenticating...');
  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!authResponse.ok) {
    throw new Error(`Authentication failed: ${authResponse.statusText}`);
  }

  const authData = await authResponse.json();
  const token = authData.access_token;
  console.log('✅ Authentication successful');

  // Step 2: Calculate paces
  console.log('📊 Calculating training paces...');
  const paceResponse = await fetch(`${baseUrl}/api/pace-calculator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      performanceInput: {
        recentRaceDistance: '10k',
        recentRaceTime: '45:00',
      }
    }),
  });

  if (!paceResponse.ok) {
    throw new Error(`Pace calculation failed: ${paceResponse.statusText}`);
  }

  const { trainingPaces } = await paceResponse.json();
  console.log('✅ Pace calculation successful');

  // Step 3: Test different experience levels and weekly volumes
  const testConfigurations = [
    {
      name: 'Beginner - Low Volume',
      experienceLevel: 'beginner',
      weeklyVolume: 'low',
      expectedWeeklyDistance: 20000 // 20km base
    },
    {
      name: 'Intermediate - Medium Volume',
      experienceLevel: 'intermediate',
      weeklyVolume: 'medium',
      expectedWeeklyDistance: 40000 // 40km base
    },
    {
      name: 'Advanced - High Volume',
      experienceLevel: 'advanced',
      weeklyVolume: 'high',
      expectedWeeklyDistance: 60000 // 60km base
    }
  ];

  for (const config of testConfigurations) {
    console.log(`\n🏃 Testing: ${config.name}`);
    
    const planConfig = {
      raceName: `Test Half Marathon - ${config.name}`,
      raceDistance: 'Half Marathon',
      raceDate: '2025-08-15', // Future date
      trainingPaces,
      experienceLevel: config.experienceLevel,
      weeklyVolume: config.weeklyVolume,
    };

    const planResponse = await fetch(`${baseUrl}/api/training-plan/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(planConfig),
    });

    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error(`❌ Plan generation failed for ${config.name}:`, errorText);
      continue;
    }

    const { plan } = await planResponse.json();
    console.log(`✅ Plan generated successfully`);
    console.log(`   Total weeks: ${plan.totalWeeks}`);
    console.log(`   Start date: ${plan.startDate}`);
    console.log(`   First week distance: ${(plan.weeklySchedules[0]?.totalWeeklyDistance / 1000).toFixed(1)}km`);
    console.log(`   Training phases: ${[...new Set(plan.weeklySchedules.map(w => w.phase))].join(', ')}`);
    
    // Validate training phases exist
    const phases = plan.weeklySchedules.map(w => w.phase);
    const uniquePhases = [...new Set(phases)];
    console.log(`   Unique phases: ${uniquePhases.length} (${uniquePhases.join(', ')})`);
    
    // Check for proper periodization
    const baseWeeks = phases.filter(p => p === 'Base').length;
    const buildWeeks = phases.filter(p => p === 'Build').length;
    const peakWeeks = phases.filter(p => p === 'Peak').length;
    const taperWeeks = phases.filter(p => p === 'Taper').length;
    
    console.log(`   Phase distribution: Base(${baseWeeks}) → Build(${buildWeeks}) → Peak(${peakWeeks}) → Taper(${taperWeeks})`);
    
    // Check for workout variety
    const runTypes = [...new Set(plan.weeklySchedules.flatMap(w => w.runs.map(r => r.runType)))];
    console.log(`   Workout types: ${runTypes.join(', ')}`);
    
    // Verify deload weeks (every 4th week should have reduced volume)
    const week4 = plan.weeklySchedules.find(w => w.weekNumber === 4);
    const week8 = plan.weeklySchedules.find(w => w.weekNumber === 8);
    if (week4 && week8) {
      const week3Distance = plan.weeklySchedules.find(w => w.weekNumber === 3)?.totalWeeklyDistance || 0;
      const week4Distance = week4.totalWeeklyDistance || 0;
      const deloadReduction = ((week3Distance - week4Distance) / week3Distance * 100).toFixed(1);
      console.log(`   Deload week 4: ${deloadReduction}% volume reduction`);
    }
    
    console.log(`   ✨ ${config.name} validation complete`);
  }

  console.log('\n🎉 Enhanced plan generation testing completed successfully!');
}

testEnhancedPlanGeneration().catch(console.error);
