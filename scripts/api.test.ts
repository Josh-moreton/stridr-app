import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const baseUrl = 'http://localhost:3000';

// Helper function to make HTTP requests
async function makeRequest(endpoint: string, method = 'GET', data: any = null, headers: Record<string, string> = {}) {
  const url = `${baseUrl}${endpoint}`;
  const options: RequestInit = {
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
      error: (error as Error).message,
      data: null
    };
  }
}

describe('Stridr API Test Suite', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        const response = await fetch(baseUrl);
        if (response.status !== 0) break;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }
    
    if (retries === 0) {
      throw new Error('Server not responding after 10 retries');
    }
  });

  describe('Pace Calculator API', () => {
    const validPaceCalculatorData = {
      performanceInput: {
        recentRaceDistance: "5k",
        recentRaceTime: "20:00"
      }
    };

    it('should calculate paces for valid 5K input', async () => {
      const response = await makeRequest('/api/pace-calculator', 'POST', validPaceCalculatorData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.trainingPaces).toBeDefined();
      expect(response.data.trainingPaces.vdot).toBeGreaterThan(0);
      expect(response.data.trainingPaces.easyPace).toBeDefined();
      expect(response.data.trainingPaces.tempoPace).toBeDefined();
      expect(response.data.trainingPaces.intervalPace).toBeDefined();
    });

    it('should calculate paces for Half Marathon', async () => {
      const halfMarathonData = {
        performanceInput: {
          recentRaceDistance: "Half Marathon",
          recentRaceTime: "1:30:00"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', halfMarathonData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.trainingPaces.vdot).toBeGreaterThan(0);
    });

    it('should calculate paces for custom distance', async () => {
      const customData = {
        performanceInput: {
          recentRaceDistance: "Custom",
          recentRaceTime: "25:00",
          customRaceDistanceValue: "6",
          customRaceDistanceUnits: "km"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', customData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should handle marathon distance', async () => {
      const marathonData = {
        performanceInput: {
          recentRaceDistance: "Marathon",
          recentRaceTime: "3:00:00"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', marathonData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should return 400 for missing time field', async () => {
      const invalidData = {
        performanceInput: {
          recentRaceDistance: "5k"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', invalidData);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid distance', async () => {
      const invalidData = {
        performanceInput: {
          recentRaceDistance: "invalid",
          recentRaceTime: "20:00"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', invalidData);
      
      expect(response.status).toBe(400);
    });

    it('should return 405 for GET method', async () => {
      const response = await makeRequest('/api/pace-calculator', 'GET');
      
      expect(response.status).toBe(405);
    });

    it('should handle extremely fast times', async () => {
      const fastData = {
        performanceInput: {
          recentRaceDistance: "5k",
          recentRaceTime: "13:00"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', fastData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.trainingPaces.vdot).toBeGreaterThan(60); // Elite level
    });

    it('should handle slow times', async () => {
      const slowData = {
        performanceInput: {
          recentRaceDistance: "5k",
          recentRaceTime: "40:00"
        }
      };
      
      const response = await makeRequest('/api/pace-calculator', 'POST', slowData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.trainingPaces.vdot).toBeLessThan(40); // Beginner level
    });
  });

  describe('Protected APIs - Authentication Required', () => {
    const testCases = [
      { endpoint: '/api/calendar', method: 'GET', description: 'Calendar API' },
      { 
        endpoint: '/api/training-plan/generate', 
        method: 'POST', 
        description: 'Training Plan Generation',
        data: {
          planConfiguration: {
            raceName: "Test Race",
            raceDistance: "5k",
            raceDate: "2025-08-01",
            trainingPaces: {
              easyPace: { minPerKm: 4862, maxPerKm: 6077 },
              tempoPace: { minPerKm: 4144, maxPerKm: 4240 }
            }
          }
        }
      },
      { endpoint: '/api/plan-analysis', method: 'GET', description: 'Plan Analysis API' },
      { 
        endpoint: '/api/workout/structure', 
        method: 'POST', 
        description: 'Workout Structure API',
        data: {
          runType: "Easy",
          description: "Easy run",
          trainingPaces: {
            easyPace: { minPerKm: 4862, maxPerKm: 6077 }
          }
        }
      },
      { endpoint: '/api/training-plan/crud', method: 'GET', description: 'Training Plan CRUD API' },
      { 
        endpoint: '/api/fit-workout/generate', 
        method: 'POST', 
        description: 'FIT Workout Generation API',
        data: {
          scheduledRun: {
            date: "2025-06-15",
            dayOfWeek: 1,
            runType: "Easy",
            description: "Easy run"
          }
        }
      }
    ];

    testCases.forEach(({ endpoint, method, description, data }) => {
      it(`should return 401 for unauthorized ${description}`, async () => {
        const response = await makeRequest(endpoint, method, data);
        
        expect(response.status).toBe(401);
        expect(response.data.error).toMatch(/[Uu]nauthorized|[Aa]uthentication/);
      });
    });
  });

  describe('HTTP Method Validation', () => {
    const invalidMethodTests = [
      { endpoint: '/api/pace-calculator', method: 'GET', description: 'Pace calculator with GET' },
      { endpoint: '/api/pace-calculator', method: 'PUT', description: 'Pace calculator with PUT' },
      { endpoint: '/api/pace-calculator', method: 'DELETE', description: 'Pace calculator with DELETE' },
      { endpoint: '/api/calendar', method: 'POST', description: 'Calendar with POST' },
      { endpoint: '/api/calendar', method: 'DELETE', description: 'Calendar with DELETE' }
    ];

    invalidMethodTests.forEach(({ endpoint, method, description }) => {
      it(`should return 405 for ${description}`, async () => {
        const response = await makeRequest(endpoint, method);
        
        expect(response.status).toBe(405);
      });
    });
  });

  describe('Non-existent Endpoints', () => {
    const nonExistentEndpoints = [
      '/api/nonexistent',
      '/api/fake-endpoint',
      '/api/pace-calculator/invalid',
      '/api/training-plan/nonexistent'
    ];

    nonExistentEndpoints.forEach(endpoint => {
      it(`should return 404 for ${endpoint}`, async () => {
        const response = await makeRequest(endpoint, 'GET');
        
        expect(response.status).toBe(404);
      });
    });
  });

  describe('Malformed Requests', () => {
    it('should handle invalid JSON in pace calculator', async () => {
      const response = await fetch(`${baseUrl}/api/pace-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      expect(response.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const response = await makeRequest('/api/pace-calculator', 'POST', {});
      
      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${baseUrl}/api/pace-calculator`, {
        method: 'POST',
        body: JSON.stringify({
          performanceInput: {
            recentRaceDistance: "5k",
            recentRaceTime: "20:00"
          }
        })
      });
      
      // Should still work or return a specific error
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to pace calculator within reasonable time', async () => {
      const start = Date.now();
      
      const response = await makeRequest('/api/pace-calculator', 'POST', {
        performanceInput: {
          recentRaceDistance: "5k",
          recentRaceTime: "20:00"
        }
      });
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        makeRequest('/api/pace-calculator', 'POST', {
          performanceInput: {
            recentRaceDistance: "5k",
            recentRaceTime: "20:00"
          }
        })
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });
    });
  });
});
