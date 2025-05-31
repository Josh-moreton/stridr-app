#!/usr/bin/env node

const baseUrl = 'http://localhost:3000';

console.log('🚀 Starting Simple API Test');

async function testPaceCalculator() {
  console.log('Testing Pace Calculator API...');
  
  try {
    const response = await fetch(`${baseUrl}/api/pace-calculator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        performanceInput: {
          recentRaceDistance: "5k",
          recentRaceTime: "20:00"
        }
      })
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testProtectedAPI() {
  console.log('\nTesting Protected API (Calendar)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/calendar`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  await testPaceCalculator();
  await testProtectedAPI();
  console.log('\n🎉 Simple test completed!');
}

runTests().catch(console.error);
