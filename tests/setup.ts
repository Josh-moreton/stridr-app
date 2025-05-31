import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env' });

// Increase timeout for API tests
jest.setTimeout(30000);

// Global test setup
global.beforeAll(() => {
  console.log('Starting API test suite...');
});

global.afterAll(() => {
  console.log('API test suite completed.');
});
