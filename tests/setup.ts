import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env' });

// Set a longer timeout for all tests
jest.setTimeout(30000);

// Set environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-test-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-test-anon-key';

// Set up any global test variables
global.testState = {
  authToken: null,
  userId: null,
};

console.log('Starting API test suite...');

// Cleanup after all tests
afterAll(() => {
  console.log('API test suite completed.');
});
