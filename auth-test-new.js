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
console.log('='.repeat(60));

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(endpoint, method = 'GET', data = null, sessionCookies = '') {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    let responseData;
    
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    return {
      status: response.status,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      data: null
    };
  }
}

// Authenticate with Supabase
async function authenticateUser() {
  console.log('\n🔐 Authenticating user...');
  
  try {
    const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
    
    const response = await fetch(authUrl, {
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
    
    const authData = await response.json();
    
    if (response.ok && authData.access_token) {
      console.log('✅ Authentication successful');
      console.log('✅ Access token received');
      console.log('✅ Refresh token received');
      
      // Create session cookies in the format your app expects
      const projectRef = supabaseUrl.split('//')[1].split('.')[0];
      const sessionCookies = [
        `sb-${projectRef}-auth-token=${authData.access_token}`,
        `sb-${projectRef}-auth-token-code-verifier=dummy-verifier`
      ].join('; ');
      
      return {
        sessionCookies,
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        user: authData.user
      };
    } else {
      console.log('❌ Authentication failed:', authData);
      return null;
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return null;
  }
}

// Test all protected APIs
async function testProtectedAPIs(authData) {
  console.log('\n🔒 Testing Protected APIs');
  
  if (!authData) {
    console.log('❌ No authentication data available');
    return;
  }
  
  console.log(`✅ Using session for user: ${authData.user.email}`);
  
  const tests = [
    {
      name: 'Calendar API',
      endpoint: '/api/calendar',
      method: 'GET'
    },
    {
      name: 'Plan Analysis API',
      endpoint: '/api/plan-analysis',
      method: 'GET'
    },
    {
      name: 'Training Plan CRUD API',
      endpoint: '/api/training-plan/crud',
      method: 'GET'
    },
    {
      name: 'Training Plan Generate API',
      endpoint: '/api/training-plan/generate',
      method: 'POST',
      data: {
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
      }
    },
    {
      name: 'Workout Structure API',
      endpoint: '/api/workout/structure',
      method: 'POST',
      data: {
        runType: "Easy",
        description: "Easy 5K run",
        distance: 5000,
        trainingPaces: {
          easyPace: { minPerKm: 4862, maxPerKm: 6077 },
          tempoPace: { minPerKm: 4144, maxPerKm: 4240 }
        }
      }
    },
    {
      name: 'FIT Workout Generate API',
      endpoint: '/api/fit-workout/generate',
      method: 'POST',
      data: {
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
      }
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log(`   Endpoint: ${test.method} ${test.endpoint}`);
    
    const response = await makeAuthenticatedRequest(
      test.endpoint, 
      test.method, 
      test.data, 
      authData.sessionCookies
    );
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ SUCCESS');
      if (typeof response.data === 'object' && response.data) {
        const keys = Object.keys(response.data);
        console.log(`   Response keys: ${keys.join(', ')}`);
        
        // Show some sample data for successful responses
        if (keys.length > 0) {
          const firstKey = keys[0];
          const value = response.data[firstKey];
          if (typeof value === 'string' && value.length > 100) {
            console.log(`   ${firstKey}: ${value.substring(0, 100)}...`);
          } else if (Array.isArray(value)) {
            console.log(`   ${firstKey}: Array with ${value.length} items`);
          } else {
            console.log(`   ${firstKey}: ${JSON.stringify(value)}`);
          }
        }
      }
    } else if (response.status === 401) {
      console.log('   🔒 UNAUTHORIZED - Authentication may have failed');
      console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
    } else if (response.status === 400) {
      console.log('   ❌ BAD REQUEST');
      console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
    } else {
      console.log(`   ❌ ERROR: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    }
  }
}

// Main execution
async function runAuthenticatedTests() {
  try {
    // Authenticate
    const authData = await authenticateUser();
    
    if (!authData) {
      console.log('\n❌ Authentication failed. Cannot proceed with protected API tests.');
      return;
    }
    
    // Test protected APIs
    await testProtectedAPIs(authData);
    
    console.log('\n🎉 Authenticated API testing completed!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

runAuthenticatedTests();
