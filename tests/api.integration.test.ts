import { createClient } from '@supabase/supabase-js';

// API Test Suite for Stridr Training App
// This test suite validates all API endpoints end-to-end

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'josh3@rwxt.org';
const TEST_PASSWORD = 'yo50mhO4xqkdd';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: any;
}

interface TestState {
  auth?: AuthTokens;
  generatedPlanId?: string;
  calculatedPaces?: any;
}

describe('Stridr API Integration Tests', () => {
  let testState: TestState = {};
  let supabase: any;

  beforeAll(async () => {
    // Initialize Supabase client for authentication
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log('🚀 Starting API integration tests...');
    console.log('Base URL:', BASE_URL);
  });

  afterAll(async () => {
    // Cleanup: delete test plan if created
    if (testState.generatedPlanId && testState.auth) {
      try {
        const response = await fetch(`${BASE_URL}/api/training-plan/crud?planId=${testState.generatedPlanId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${testState.auth.accessToken}`,
          },
        });
        console.log('🧹 Cleaned up test plan:', response.status);
      } catch (error) {
        console.warn('Could not cleanup test plan:', error);
      }
    }

    // Sign out
    if (supabase) {
      await supabase.auth.signOut();
    }
  });

  // Test 1: Authentication
  describe('Authentication', () => {
    test('should authenticate user with provided credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.session).toBeTruthy();
      expect(data.session.access_token).toBeTruthy();
      expect(data.user).toBeTruthy();

      testState.auth = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: data.user,
      };

      console.log('✅ Authentication successful');
      console.log('User ID:', data.user.id);
    });
  });

  // Test 2: Pace Calculator API
  describe('Pace Calculator API', () => {
    test('should calculate training paces from recent performance', async () => {
      const performanceInput = {
        recentRaceDistance: '5k',
        recentRaceTime: '22:30',
        customRaceDistanceValue: '',
        customRaceDistanceUnits: 'km' as const,
      };

      const response = await fetch(`${BASE_URL}/api/pace-calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performanceInput }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.trainingPaces).toBeTruthy();
      expect(data.trainingPaces.easyPace).toBeTruthy();
      expect(data.trainingPaces.tempoPace).toBeTruthy();
      expect(data.trainingPaces.intervalPace).toBeTruthy();
      expect(data.trainingPaces.vdot).toBeGreaterThan(0);

      testState.calculatedPaces = data.trainingPaces;

      console.log('✅ Pace calculation successful');
      console.log('VDOT:', data.trainingPaces.vdot);
      console.log('Easy pace:', data.trainingPaces.easyPace);
    });

    test('should handle invalid performance input', async () => {
      const invalidInput = {
        recentRaceDistance: '5k',
        recentRaceTime: 'invalid-time',
        customRaceDistanceValue: '',
        customRaceDistanceUnits: 'km' as const,
      };

      const response = await fetch(`${BASE_URL}/api/pace-calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performanceInput: invalidInput }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();

      console.log('✅ Pace calculator error handling works');
    });
  });

  // Test 3: Training Plan Generation API
  describe('Training Plan Generation API', () => {
    test('should generate and save a training plan', async () => {
      expect(testState.auth).toBeTruthy();
      expect(testState.calculatedPaces).toBeTruthy();

      const planConfig = {
        raceName: 'Test Marathon',
        raceDistance: 'Marathon',
        customRaceDistanceValue: '',
        customRaceDistanceUnits: 'km' as const,
        raceDate: '2025-12-31',
        trainingPaces: testState.calculatedPaces,
      };

      const response = await fetch(`${BASE_URL}/api/training-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
        body: JSON.stringify(planConfig),
      });

      if (response.status !== 200) {
        const errorData = await response.text();
        console.log('❌ Plan generation failed with status:', response.status);
        console.log('❌ Error response:', errorData);
      }

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain('successfully');
      expect(data.trainingPlanId).toBeTruthy();
      expect(data.generatedPlan).toBeTruthy();
      expect(data.generatedPlan.weeklySchedules).toBeTruthy();
      expect(data.generatedPlan.weeklySchedules.length).toBeGreaterThan(0);

      testState.generatedPlanId = data.trainingPlanId;

      console.log('✅ Training plan generation successful');
      console.log('Plan ID:', data.trainingPlanId);
      console.log('Total weeks:', data.generatedPlan.totalWeeks);
    });

    test('should require authentication for plan generation', async () => {
      const planConfig = {
        raceName: 'Unauthorized Test',
        raceDistance: '5k',
        customRaceDistanceValue: '',
        customRaceDistanceUnits: 'km' as const,
        raceDate: '2025-12-31',
        trainingPaces: testState.calculatedPaces,
      };

      const response = await fetch(`${BASE_URL}/api/training-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
        body: JSON.stringify(planConfig),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Authentication');

      console.log('✅ Plan generation auth protection works');
    });
  });

  // Test 4: Training Plan CRUD API
  describe('Training Plan CRUD API', () => {
    test('should fetch user training plans', async () => {
      expect(testState.auth).toBeTruthy();

      const response = await fetch(`${BASE_URL}/api/training-plan/crud`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.plans).toBeTruthy();
      expect(Array.isArray(data.plans)).toBe(true);
      expect(data.plans.length).toBeGreaterThan(0);

      console.log('✅ Training plans fetch successful');
      console.log('Plans found:', data.plans.length);
    });

    test('should fetch specific training plan with details', async () => {
      expect(testState.auth).toBeTruthy();
      expect(testState.generatedPlanId).toBeTruthy();

      const response = await fetch(`${BASE_URL}/api/training-plan/crud?planId=${testState.generatedPlanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.plan).toBeTruthy();
      expect(data.plan.id).toBe(testState.generatedPlanId);
      expect(data.plan.plan_weekly_schedules).toBeTruthy();

      console.log('✅ Specific plan fetch successful');
      console.log('Plan name:', data.plan.plan_name);
      console.log('Weekly schedules:', data.plan.plan_weekly_schedules?.length || 0);
    });

    test('should update a training plan', async () => {
      expect(testState.auth).toBeTruthy();
      expect(testState.generatedPlanId).toBeTruthy();

      const updates = {
        plan_name: 'Updated Test Marathon',
      };

      const response = await fetch(`${BASE_URL}/api/training-plan/crud?planId=${testState.generatedPlanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
        body: JSON.stringify({ updates }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.plan).toBeTruthy();
      expect(data.plan.plan_name).toBe('Updated Test Marathon');

      console.log('✅ Plan update successful');
    });

    test('should require authentication for CRUD operations', async () => {
      const response = await fetch(`${BASE_URL}/api/training-plan/crud`, {
        method: 'GET',
        // No Authorization header
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');

      console.log('✅ CRUD auth protection works');
    });
  });

  // Test 5: Calendar API
  describe('Calendar API', () => {
    test('should fetch calendar events when authenticated', async () => {
      expect(testState.auth).toBeTruthy();
      
      // First, ensure we have at least one training plan in the system
      expect(testState.generatedPlanId).toBeTruthy();
      
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0];

      // Request calendar events
      const response = await fetch(`${BASE_URL}/api/calendar?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Calendar might be empty if no runs are scheduled, but the API should work
      console.log('✅ Calendar API authentication successful');
      console.log('Events found:', data.events?.length || 0);
    });

    test('should require authentication for calendar access', async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      // Request calendar events without authentication
      const response = await fetch(`${BASE_URL}/api/calendar?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBeTruthy();
      
      console.log('✅ Calendar API auth protection works');
    });

    test('should create and delete a calendar event', async () => {
      expect(testState.auth).toBeTruthy();
      
      // Create an event first
      const today = new Date();
      const eventDate = today.toISOString().split('T')[0];
      
      const eventData = {
        scheduled_date: eventDate,
        run_type: 'easy',
        title: 'Test Easy Run',
        description: 'This is a test run',
        total_distance_meters: 5000,
        total_duration_seconds: 1800,
        plan_id: testState.generatedPlanId,
      };

      // Create the event
      const createResponse = await fetch(`${BASE_URL}/api/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
        body: JSON.stringify(eventData),
      });

      expect(createResponse.status).toBe(200);
      
      const createData = await createResponse.json();
      expect(createData.success).toBe(true);
      expect(createData.event).toBeTruthy();
      expect(createData.event.id).toBeTruthy();
      
      const eventId = createData.event.id;
      
      // Now delete the event
      const deleteResponse = await fetch(`${BASE_URL}/api/calendar?eventId=${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);
      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);
      
      console.log('✅ Calendar event creation and deletion successful');
    });
  });

  // Test 6: Cross-API Integration Flow
  describe('Complete API Flow Integration', () => {
    test('should complete full user workflow: calculate paces → generate plan → retrieve plan', async () => {
      // This test validates the complete user journey
      console.log('🔄 Testing complete API flow...');

      // Step 1: Calculate paces
      const performanceInput = {
        recentRaceDistance: '10k',
        recentRaceTime: '45:00',
        customRaceDistanceValue: '',
        customRaceDistanceUnits: 'km' as const,
      };

      const paceResponse = await fetch(`${BASE_URL}/api/pace-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performanceInput }),
      });

      expect(paceResponse.status).toBe(200);
      const paceData = await paceResponse.json();

      // Step 2: Generate plan with calculated paces
      const planConfig = {
        raceName: 'Integration Test Half Marathon',
        raceDistance: 'Half Marathon',
        customRaceDistanceValue: '',
        customRaceDistanceUnits: 'km' as const,
        raceDate: '2026-06-15',
        trainingPaces: paceData.trainingPaces,
      };

      const planResponse = await fetch(`${BASE_URL}/api/training-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
        body: JSON.stringify(planConfig),
      });

      expect(planResponse.status).toBe(200);
      const planData = await planResponse.json();
      const integrationPlanId = planData.trainingPlanId;

      // Step 3: Retrieve the generated plan
      const retrieveResponse = await fetch(`${BASE_URL}/api/training-plan/crud?planId=${integrationPlanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
      });

      expect(retrieveResponse.status).toBe(200);
      const retrieveData = await retrieveResponse.json();
      expect(retrieveData.plan.plan_name).toBe('Integration Test Half Marathon');

      // Step 4: Cleanup - delete the integration test plan
      const deleteResponse = await fetch(`${BASE_URL}/api/training-plan/crud?planId=${integrationPlanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testState.auth!.accessToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      console.log('✅ Complete API flow integration successful');
      console.log('Flow: Pace calculation → Plan generation → Plan retrieval → Plan deletion');
    });
  });
});

// Performance and Load Testing
describe('API Performance Tests', () => {
  test('pace calculator should respond within acceptable time', async () => {
    const start = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/pace-calculator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performanceInput: {
          recentRaceDistance: '5k',
          recentRaceTime: '20:00',
          customRaceDistanceValue: '',
          customRaceDistanceUnits: 'km' as const,
        }
      }),
    });

    const duration = Date.now() - start;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(5000); // Should respond within 5 seconds

    console.log(`✅ Pace calculator performance: ${duration}ms`);
  });
});
