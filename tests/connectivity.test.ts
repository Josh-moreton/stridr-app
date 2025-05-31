/**
 * Quick API connectivity test
 * This test verifies that the development server is running and APIs are accessible
 */

const BASE_URL = 'http://localhost:3000';

describe('API Connectivity Test', () => {
  test('development server should be running', async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/pace-calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          performanceInput: {
            recentRaceDistance: '5k',
            recentRaceTime: '20:00',
            customRaceDistanceValue: '',
            customRaceDistanceUnits: 'km',
          }
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.trainingPaces).toBeTruthy();

      console.log('✅ Development server is running and pace calculator API is working');
      console.log('VDOT calculated:', data.trainingPaces.vdot);
    } catch (error) {
      console.error('❌ Failed to connect to development server:', error);
      console.log('Make sure the development server is running with: npm run dev');
      throw error;
    }
  });
});
