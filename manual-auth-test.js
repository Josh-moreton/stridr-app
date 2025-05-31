#!/usr/bin/env node

const baseUrl = 'http://localhost:3000';
const supabaseUrl = 'https://fohkeuowmgjnvvjzesiw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaGtldW93bWdqbnZ2anplc2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTY3MzcsImV4cCI6MjA2NDA5MjczN30.XwzZqPvgToWy45fBaRsLwjuRq15YJs5CTH5nEnaRvjI';

// Test user credentials
const testUser = {
  email: 'josh3@rwxt.org',
  password: 'yo50mhO4xqkdd'
};

console.log('🚀 Starting Authenticated API Testing');
console.log(`Testing against: ${baseUrl}`);
console.log(`Test user: ${testUser.email}`);
console.log('=' .repeat(60));
const testUser = {
  email: 'test.stridr@example.com',
  password: 'testpassword123'
};

async function signUpUser() {
  console.log('\n1️⃣ Creating test user via Supabase Auth API...');
  
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const data = await response.json();
    console.log('✅ Signup Response Status:', response.status);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ User created successfully');
      console.log('📧 Check email for verification (if email confirmation enabled)');
      return data;
    } else if (response.status === 422 && data.msg?.includes('already')) {
      console.log('ℹ️ User already exists, proceeding to sign in...');
      return { user: { email: testUser.email } };
    } else {
      console.log('❌ Signup failed:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Signup error:', error.message);
    return null;
  }
}

async function signInUser() {
  console.log('\n2️⃣ Signing in user via Supabase Auth API...');
  
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const data = await response.json();
    console.log('✅ SignIn Response Status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ User signed in successfully');
      console.log('📝 Access Token:', data.access_token?.substring(0, 50) + '...');
      console.log('🔄 Refresh Token:', data.refresh_token?.substring(0, 50) + '...');
      return data;
    } else {
      console.log('❌ SignIn failed:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ SignIn error:', error.message);
    return null;
  }
}

async function testProtectedAPI(accessToken, endpoint, method = 'GET', payload = null) {
  console.log(`\n🧪 Testing ${method} ${endpoint}...`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Set the Authorization header with the access token
      'Authorization': `Bearer ${accessToken}`,
      // Also set cookies that Next.js/Supabase SSR expects
      'Cookie': `sb-fohkeuowmgjnvvjzesiw-auth-token=${accessToken}`
    }
  };
  
  if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(payload);
  }
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Response:`, typeof parsedData === 'object' ? JSON.stringify(parsedData, null, 2) : parsedData);
    
    return { status: response.status, data: parsedData };
  } catch (error) {
    console.log(`❌ Error testing ${endpoint}:`, error.message);
    return { status: 0, error: error.message };
  }
}

async function runAuthenticatedTests() {
  // Step 1: Create user (if doesn't exist)
  const signupResult = await signUpUser();
  if (!signupResult) {
    console.log('❌ Failed to create user, stopping tests');
    return;
  }
  
  // Step 2: Sign in user
  const signinResult = await signInUser();
  if (!signinResult || !signinResult.access_token) {
    console.log('❌ Failed to sign in user, stopping tests');
    return;
  }
  
  const accessToken = signinResult.access_token;
  
  console.log('\n' + '=' * 50);
  console.log('🧪 Testing Protected APIs with Authentication');
  console.log('=' * 50);
  
  // Test each protected API
  await testProtectedAPI(accessToken, '/api/calendar', 'GET');
  
  await testProtectedAPI(accessToken, '/api/plan-analysis', 'GET');
  
  await testProtectedAPI(accessToken, '/api/training-plan/crud', 'GET');
  
  // Test training plan generation with proper payload
  const planPayload = {
    planConfiguration: {
      raceName: "Test 5K Race",
      raceDistance: "5k",
      raceDate: "2025-08-01",
      trainingPaces: {
        easyPace: { minPerKm: 4862, maxPerKm: 6077 },
        tempoPace: { minPerKm: 4144, maxPerKm: 4240 },
        intervalPace: { minPerKm: 3646, maxPerKm: 3759 },
        longRunPace: { minPerKm: 4862, maxPerKm: 6077 },
        vdot: 49.8
      }
    }
  };
  
  await testProtectedAPI(accessToken, '/api/training-plan/generate', 'POST', planPayload);
  
  // Test workout structure API
  const workoutPayload = {
    runType: "Easy",
    description: "Easy 5K run",
    distance: 5000,
    trainingPaces: {
      easyPace: { minPerKm: 4862, maxPerKm: 6077 },
      tempoPace: { minPerKm: 4144, maxPerKm: 4240 }
    }
  };
  
  await testProtectedAPI(accessToken, '/api/workout/structure', 'POST', workoutPayload);
  
  // Test FIT workout generation
  const fitPayload = {
    scheduledRun: {
      date: "2025-06-15",
      dayOfWeek: 1,
      runType: "Easy",
      description: "Easy 5K run",
      totalDuration: 1800,
      totalDistance: 5000,
      steps: [
        {
          type: "WarmUp",
          duration: 600,
          description: "10 minute warm-up"
        },
        {
          type: "Run",
          duration: 1200,
          distance: 5000,
          description: "Main run"
        }
      ]
    }
  };
  
  await testProtectedAPI(accessToken, '/api/fit-workout/generate', 'POST', fitPayload);
  
  console.log('\n' + '=' * 50);
  console.log('🎉 Authentication Testing Complete!');
  console.log('=' * 50);
}

runAuthenticatedTests().catch(console.error);
