#!/usr/bin/env node

const SERVER_URL = 'http://localhost:3000';

console.log('=== Manual Authentication Test ===');
console.log('');
console.log('To test protected APIs properly, we need to authenticate through the browser first:');
console.log('');
console.log('STEPS:');
console.log('1. Open http://localhost:3000/auth/signin in your browser');
console.log('2. Sign in with the test account: josh3@rwxt.org / yo50mhO4xqkdd');
console.log('3. After successful login, open browser developer tools (F12)');
console.log('4. Go to Application/Storage tab > Cookies');
console.log('5. Look for Supabase-related cookies and copy their names and values');
console.log('6. Use those cookies in our API test scripts');
console.log('');
console.log('Expected cookie patterns:');
console.log('- sb-[project-id]-auth-token');
console.log('- sb-[project-id]-auth-token-code-verifier');
console.log('- sb-[project-id]-auth-token.0, .1, etc. (if large)');
console.log('');
console.log('OR use the simple cookie testing script after login...');

// Simple test function that can be called after getting real session cookies
const testProtectedAPI = async (cookies) => {
  try {
    console.log('\n=== Testing Protected API with cookies ===');
    
    const response = await fetch(`${SERVER_URL}/api/calendar`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: Authentication worked!');
    } else {
      console.log('❌ FAILED: Still getting', response.status);
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testProtectedAPI };
}

console.log('');
console.log('Example usage after getting cookies from browser:');
console.log('');
console.log('const cookies = "sb-fohkeuowmgjnvvjzesiw-auth-token=eyJ0eXAi...; sb-fohkeuowmgjnvvjzesiw-auth-token-code-verifier=...";');
console.log('testProtectedAPI(cookies);');
