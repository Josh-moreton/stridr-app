/**
 * Programmatic Authentication Test
 * 
 * This script tests the authentication system by:
 * 1. First testing unauthenticated access (should get 401)
 * 2. Testing unprotected APIs (should work)
 * 3. Testing Supabase authentication directly
 */

// Use built-in fetch (Node.js 18+) or require node-fetch
let fetch;
try {
  // Try built-in fetch first (Node.js 18+)
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback to node-fetch if available
    fetch = require('node-fetch');
  }
} catch (e) {
  console.log('❌ Fetch not available. Please install node-fetch or use Node.js 18+');
  process.exit(1);
}

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'josh3@rwxt.org',
  password: 'yo50mhO4xqkdd'
};

// Test unauthenticated access to protected APIs
async function testUnauthenticatedAccess() {
  console.log('🔒 Testing unauthenticated access to protected APIs...');
  
  const protectedEndpoints = [
    '/api/calendar',
    '/api/training-plan/generate',
    '/api/plan-analysis'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: endpoint === '/api/training-plan/generate' ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: endpoint === '/api/training-plan/generate' ? JSON.stringify({
          raceDistance: '5K',
          raceDate: '2024-03-15',
          currentFitness: 'intermediate',
          trainingDays: 4
        }) : undefined
      });
      
      console.log(`  ${endpoint}: ${response.status} ${response.status === 401 ? '✅' : '❌'}`);
      
      if (response.status !== 401) {
        const text = await response.text();
        console.log(`    Unexpected response: ${text.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`  ${endpoint}: Error - ${error.message}`);
    }
  }
}

// Test the pace calculator (unprotected API)
async function testPaceCalculator() {
  console.log('🏃‍♂️ Testing pace calculator (unprotected API)...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/pace-calculator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        performanceInput: {
          raceDistance: '5K',
          raceTime: '20:00'
        }
      })
    });
    
    console.log(`  Pace calculator: ${response.status} ${response.status === 200 ? '✅' : '❌'}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`    VDOT Score: ${data.vdotScore}, Easy pace: ${data.trainingPaces.easy}`);
    } else {
      const error = await response.text();
      console.log(`    Error: ${error.substring(0, 100)}`);
    }
  } catch (error) {
    console.log(`  Pace calculator: Error - ${error.message}`);
  }
}

// Test authentication through Supabase auth API
async function testSupabaseAuth() {
  console.log('🔐 Testing Supabase authentication...');
  
  try {
    // Try to sign in using Supabase REST API
    const authResponse = await fetch('https://fohkeuowmgjnvvjzesiw.supabase.co/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaGtldW93bWdqbnZ2anplc2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3OTIyNjMsImV4cCI6MjA0ODM2ODI2M30.sZgONK-d9TXKf7_9G0xPLKfO_sUTjWkUZMHCO1UwKiE'
      },
      body: JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
      })
    });
    
    console.log(`  Supabase auth: ${authResponse.status} ${authResponse.status === 200 ? '✅' : '❌'}`);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log(`    Access token received: ${authData.access_token ? 'Yes ✅' : 'No ❌'}`);
      console.log(`    User ID: ${authData.user?.id || 'Unknown'}`);
      return authData;
    } else {
      const error = await authResponse.text();
      console.log(`    Auth error: ${error}`);
      return null;
    }
  } catch (error) {
    console.log(`  Supabase auth: Error - ${error.message}`);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Authentication Tests');
  console.log('=====================================\n');
  
  // Test 1: Verify unprotected API works
  await testPaceCalculator();
  console.log('');
  
  // Test 2: Verify protected APIs are actually protected
  await testUnauthenticatedAccess();
  console.log('');
  
  // Test 3: Verify Supabase authentication works
  const authData = await testSupabaseAuth();
  console.log('');
  
  // Summary
  console.log('=====================================');
  console.log('🏁 Test Summary:');
  console.log('1. ✅ Pace calculator (unprotected) should work');
  console.log('2. ✅ Protected APIs should return 401 when unauthenticated');
  console.log('3. ✅ Supabase authentication should work');
  console.log('');
  console.log('🌐 Next steps:');
  console.log('- Sign in through the browser at http://localhost:3000/auth/signin');
  console.log('- Use the browser console test script to verify authenticated access');
  console.log('- Run: node test-auth-browser.js in browser dev tools');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testPaceCalculator, testUnauthenticatedAccess, testSupabaseAuth };
