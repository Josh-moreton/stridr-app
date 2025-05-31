#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for Stridr App
 * Tests all API endpoints with various scenarios
 */

const baseUrl = 'http://localhost:3000';

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to make HTTP requests
async function makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return {
      status: response.status,
      data: parsedData,
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

// Test assertion helper
function assert(condition, testName, expected, actual) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
    testResults.details.push({ test: testName, status: 'PASS' });
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual: ${JSON.stringify(actual)}`);
    testResults.details.push({ 
      test: testName, 
      status: 'FAIL', 
      expected, 
      actual 
    });
  }
}

// Test data
const testData = {
  validPaceCalculator: {
    performanceInput: {
      recentRaceDistance: "5k",
      recentRaceTime: "20:00"
    }
  },
  validPaceCalculatorHalfMarathon: {
    performanceInput: {
      recentRaceDistance: "Half Marathon",
      recentRaceTime: "1:30:00"
    }
  },
  validPaceCalculatorCustom: {
    performanceInput: {
      recentRaceDistance: "Custom",
      recentRaceTime: "25:00",
      customRaceDistanceValue: "6",
      customRaceDistanceUnits: "km"
    }
  },
  invalidPaceCalculatorMissingTime: {
    performanceInput: {
      recentRaceDistance: "5k"
    }
  },
  invalidPaceCalculatorInvalidDistance: {
    performanceInput: {
      recentRaceDistance: "invalid",
      recentRaceTime: "20:00"
    }
  },
  validTrainingPlan: {
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
  },
  validWorkoutStructure: {
    runType: "Easy",
    description: "Easy 5K run",
    distance: 5000,
    trainingPaces: {
      easyPace: { minPerKm: 4862, maxPerKm: 6077 },
      tempoPace: { minPerKm: 4144, maxPerKm: 4240 }
    }
  },
  validFitWorkout: {
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
};

// Test functions
async function testPaceCalculatorAPI() {
  console.log('\n🧪 Testing Pace Calculator API');
  
  // Test 1: Valid 5K input
  const response1 = await makeRequest('/api/pace-calculator', 'POST', testData.validPaceCalculator);
  assert(
    response1.status === 200 && response1.data.success === true,
    'Pace Calculator - Valid 5K input',
    { status: 200, success: true },
    { status: response1.status, success: response1.data?.success }
  );
  
  // Verify VDOT calculation
  if (response1.data.trainingPaces) {
    assert(
      response1.data.trainingPaces.vdot > 0,
      'Pace Calculator - VDOT calculation',
      'VDOT > 0',
      `VDOT = ${response1.data.trainingPaces.vdot}`
    );
  }

  // Test 2: Valid Half Marathon input
  const response2 = await makeRequest('/api/pace-calculator', 'POST', testData.validPaceCalculatorHalfMarathon);
  assert(
    response2.status === 200 && response2.data.success === true,
    'Pace Calculator - Valid Half Marathon input',
    { status: 200, success: true },
    { status: response2.status, success: response2.data?.success }
  );

  // Test 3: Valid Custom distance
  const response3 = await makeRequest('/api/pace-calculator', 'POST', testData.validPaceCalculatorCustom);
  assert(
    response3.status === 200 && response3.data.success === true,
    'Pace Calculator - Valid Custom distance',
    { status: 200, success: true },
    { status: response3.status, success: response3.data?.success }
  );

  // Test 4: Missing time field
  const response4 = await makeRequest('/api/pace-calculator', 'POST', testData.invalidPaceCalculatorMissingTime);
  assert(
    response4.status === 400,
    'Pace Calculator - Missing time field (400 error)',
    400,
    response4.status
  );

  // Test 5: Invalid distance
  const response5 = await makeRequest('/api/pace-calculator', 'POST', testData.invalidPaceCalculatorInvalidDistance);
  assert(
    response5.status === 400,
    'Pace Calculator - Invalid distance (400 error)',
    400,
    response5.status
  );

  // Test 6: Invalid JSON
  const response6 = await makeRequest('/api/pace-calculator', 'POST', "invalid json");
  assert(
    response6.status === 400,
    'Pace Calculator - Invalid JSON (400 error)',
    400,
    response6.status
  );

  // Test 7: Wrong HTTP method
  const response7 = await makeRequest('/api/pace-calculator', 'GET');
  assert(
    response7.status === 405,
    'Pace Calculator - Wrong HTTP method (405 error)',
    405,
    response7.status
  );
}

async function testProtectedAPIs() {
  console.log('\n🔒 Testing Protected APIs (should return 401)');
  
  const protectedEndpoints = [
    { endpoint: '/api/calendar', method: 'GET' },
    { endpoint: '/api/training-plan/generate', method: 'POST', data: testData.validTrainingPlan },
    { endpoint: '/api/plan-analysis', method: 'GET' },
    { endpoint: '/api/workout/structure', method: 'POST', data: testData.validWorkoutStructure },
    { endpoint: '/api/training-plan/crud', method: 'GET' },
    { endpoint: '/api/fit-workout/generate', method: 'POST', data: testData.validFitWorkout }
  ];

  for (const { endpoint, method, data } of protectedEndpoints) {
    const response = await makeRequest(endpoint, method, data);
    assert(
      response.status === 401,
      `${endpoint} - Unauthorized access (401 error)`,
      401,
      response.status
    );
  }
}

async function testInvalidHTTPMethods() {
  console.log('\n🚫 Testing Invalid HTTP Methods');
  
  const invalidMethods = [
    { endpoint: '/api/pace-calculator', method: 'GET' },
    { endpoint: '/api/pace-calculator', method: 'PUT' },
    { endpoint: '/api/pace-calculator', method: 'DELETE' },
    { endpoint: '/api/calendar', method: 'POST' },
    { endpoint: '/api/calendar', method: 'DELETE' }
  ];

  for (const { endpoint, method } of invalidMethods) {
    const response = await makeRequest(endpoint, method);
    assert(
      response.status === 405,
      `${endpoint} ${method} - Method not allowed (405 error)`,
      405,
      response.status
    );
  }
}

async function testNonExistentEndpoints() {
  console.log('\n🔍 Testing Non-existent Endpoints');
  
  const nonExistentEndpoints = [
    '/api/nonexistent',
    '/api/fake-endpoint',
    '/api/pace-calculator/invalid',
    '/api/training-plan/nonexistent'
  ];

  for (const endpoint of nonExistentEndpoints) {
    const response = await makeRequest(endpoint, 'GET');
    assert(
      response.status === 404,
      `${endpoint} - Not found (404 error)`,
      404,
      response.status
    );
  }
}

async function testPaceCalculatorEdgeCases() {
  console.log('\n⚡ Testing Pace Calculator Edge Cases');
  
  // Test extremely fast time
  const fastTime = await makeRequest('/api/pace-calculator', 'POST', {
    performanceInput: {
      recentRaceDistance: "5k",
      recentRaceTime: "13:00"
    }
  });
  assert(
    fastTime.status === 200 && fastTime.data.success === true,
    'Pace Calculator - Extremely fast 5K time',
    { status: 200, success: true },
    { status: fastTime.status, success: fastTime.data?.success }
  );

  // Test very slow time
  const slowTime = await makeRequest('/api/pace-calculator', 'POST', {
    performanceInput: {
      recentRaceDistance: "5k",
      recentRaceTime: "40:00"
    }
  });
  assert(
    slowTime.status === 200 && slowTime.data.success === true,
    'Pace Calculator - Very slow 5K time',
    { status: 200, success: true },
    { status: slowTime.status, success: slowTime.data?.success }
  );

  // Test marathon time
  const marathonTime = await makeRequest('/api/pace-calculator', 'POST', {
    performanceInput: {
      recentRaceDistance: "Marathon",
      recentRaceTime: "3:00:00"
    }
  });
  assert(
    marathonTime.status === 200 && marathonTime.data.success === true,
    'Pace Calculator - Marathon time',
    { status: 200, success: true },
    { status: marathonTime.status, success: marathonTime.data?.success }
  );
}

async function testServerStatus() {
  console.log('\n🏥 Testing Server Health');
  
  // Test if server is running
  try {
    const response = await fetch(baseUrl);
    assert(
      response.status !== 0,
      'Server is running',
      'Server responding',
      response.status !== 0 ? 'Server responding' : 'Server not responding'
    );
  } catch (error) {
    assert(
      false,
      'Server is running',
      'Server responding',
      `Server error: ${error.message}`
    );
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Stridr API Test Suite');
  console.log(`Testing against: ${baseUrl}`);
  console.log('=' * 50);
  
  const startTime = Date.now();
  
  await testServerStatus();
  await testPaceCalculatorAPI();
  await testPaceCalculatorEdgeCases();
  await testProtectedAPIs();
  await testInvalidHTTPMethods();
  await testNonExistentEndpoints();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '=' * 50);
  console.log('📊 Test Results Summary');
  console.log('=' * 50);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        console.log(`  - ${test.test}`);
        if (test.expected) console.log(`    Expected: ${JSON.stringify(test.expected)}`);
        if (test.actual) console.log(`    Actual: ${JSON.stringify(test.actual)}`);
      });
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed with error:', error);
    process.exit(1);
  });
}

module.exports = {
  makeRequest,
  testPaceCalculatorAPI,
  testProtectedAPIs,
  runAllTests
};
