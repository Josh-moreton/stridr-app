/**
 * Browser Authentication Test Script - Updated
 * 
 * This script tests the authenticated APIs after we've fixed the SSR authentication.
 * 
 * Instructions:
 * 1. Make sure the dev server is running at http://localhost:3000
 * 2. Open http://localhost:3000/auth/signin in your browser
 * 3. Sign in with credentials: josh3@rwxt.org / yo50mhO4xqkdd
 * 4. Open browser dev tools (F12) and go to Console tab
 * 5. Copy and paste this script into the console and run it
 */

// Simple test to verify authentication status
async function checkAuthStatus() {
  console.log('🔐 Checking authentication status...');
  
  try {
    // Try to access a simple authenticated endpoint
    const response = await fetch('/api/calendar', {
      method: 'GET',
      credentials: 'include'
    });

    console.log('Calendar API Response status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Authentication is working! User is properly authenticated.');
      return true;
    } else if (response.status === 401) {
      console.log('❌ User is not authenticated. Please sign in first.');
      return false;
    } else {
      console.log('⚠️  Unexpected response status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
    return false;
  }
}

// Test function for training plan generation API
async function testTrainingPlanGeneration() {
  console.log('🏃‍♂️ Testing Training Plan Generation API...');
  
  try {
    const response = await fetch('/api/training-plan/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        raceDistance: '5K',
        raceDate: '2024-03-15',
        currentFitness: 'intermediate',
        trainingDays: 4,
        preferences: {
          includeSpeedWork: true,
          includeLongRuns: true,
          maxWeeklyMileage: 30
        }
      })
    });

    console.log('Training plan API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Training plan generation successful!');
      console.log('Plan includes', data.trainingPlan?.weeks?.length || 0, 'weeks');
      return data;
    } else {
      const error = await response.text();
      console.log('❌ Training plan generation failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing training plan generation:', error);
    return null;
  }
}

// Test function for calendar API
async function testCalendarAPI() {
  console.log('📅 Testing Calendar API...');
  
  try {
    const response = await fetch('/api/calendar', {
      method: 'GET',
      credentials: 'include'
    });

    console.log('Calendar API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Calendar API successful!');
      console.log('Retrieved', data.events?.length || 0, 'calendar events');
      return data;
    } else {
      const error = await response.text();
      console.log('❌ Calendar API failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing calendar API:', error);
    return null;
  }
}

// Test function for plan analysis API (may have type errors but auth should work)
async function testPlanAnalysisAPI() {
  console.log('📊 Testing Plan Analysis API...');
  
  try {
    const response = await fetch('/api/plan-analysis?planId=test-plan-123', {
      method: 'GET',
      credentials: 'include'
    });

    console.log('Plan analysis API response status:', response.status);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Plan analysis API authentication working!');
      return data;
    } else if (response.status === 401) {
      console.log('❌ Plan analysis API authentication failed');
      return null;
    } else {
      // Status 400 or 500 may mean auth worked but request/implementation issues
      const error = await response.text();
      console.log('⚠️  Plan analysis API auth seems to work, but got error:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing plan analysis API:', error);
    return null;
  }
}

// Run all tests
async function runAuthenticationTests() {
  console.log('🚀 Starting Authentication Tests...');
  console.log('=====================================');
  
  // First check if user is authenticated
  const isAuthenticated = await checkAuthStatus();
  
  if (!isAuthenticated) {
    console.log('❌ User not authenticated. Please sign in at /auth/signin first!');
    return;
  }
  
  console.log('✅ User is authenticated! Running API tests...\n');
  
  // Test the main APIs we've fixed
  await testCalendarAPI();
  console.log('');
  
  await testTrainingPlanGeneration();
  console.log('');
  
  await testPlanAnalysisAPI();
  console.log('');
  
  console.log('🏁 Authentication tests completed!');
  console.log('=====================================');
}

// Auto-run the tests
console.log('🧪 Authentication Test Suite Loaded!');
console.log('Run: runAuthenticationTests()');
console.log('Or individual tests: checkAuthStatus(), testCalendarAPI(), testTrainingPlanGeneration()');
console.log('');
console.log('Make sure you are signed in at /auth/signin first!');

// Uncomment the line below to auto-run tests:
// runAuthenticationTests();
