import requests
import json
import time
import sys
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

@dataclass
class TestResult:
    test_name: str
    passed: bool
    expected: Any
    actual: Any
    error_message: Optional[str] = None

class StridrAPITester:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.results: List[TestResult] = []
        self.session = requests.Session()
        
    def make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request and return response data"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
            
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                headers=request_headers,
                timeout=10
            )
            
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                response_data = response.text
                
            return {
                "status": response.status_code,
                "data": response_data,
                "headers": dict(response.headers)
            }
        except requests.RequestException as e:
            return {
                "status": 0,
                "error": str(e),
                "data": None
            }
    
    def assert_test(self, condition: bool, test_name: str, expected: Any, actual: Any, 
                   error_message: Optional[str] = None):
        """Assert test condition and record result"""
        result = TestResult(
            test_name=test_name,
            passed=condition,
            expected=expected,
            actual=actual,
            error_message=error_message
        )
        self.results.append(result)
        
        if condition:
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}")
            print(f"   Expected: {expected}")
            print(f"   Actual: {actual}")
            if error_message:
                print(f"   Error: {error_message}")
    
    def test_server_health(self):
        """Test if server is responding"""
        print("\n🏥 Testing Server Health")
        try:
            response = self.session.get(self.base_url, timeout=5)
            self.assert_test(
                response.status_code != 0,
                "Server is responding",
                "Server responding",
                f"Status: {response.status_code}"
            )
        except requests.RequestException as e:
            self.assert_test(
                False,
                "Server is responding",
                "Server responding",
                f"Server error: {str(e)}"
            )
    
    def test_pace_calculator_api(self):
        """Test Pace Calculator API with various scenarios"""
        print("\n🧪 Testing Pace Calculator API")
        
        # Test 1: Valid 5K input
        valid_5k_data = {
            "performanceInput": {
                "recentRaceDistance": "5k",
                "recentRaceTime": "20:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", valid_5k_data)
        self.assert_test(
            response["status"] == 200 and response["data"].get("success") == True,
            "Pace Calculator - Valid 5K input",
            {"status": 200, "success": True},
            {"status": response["status"], "success": response["data"].get("success")}
        )
        
        # Verify VDOT calculation
        if response["data"].get("trainingPaces"):
            vdot = response["data"]["trainingPaces"].get("vdot", 0)
            self.assert_test(
                vdot > 0,
                "Pace Calculator - VDOT calculation",
                "VDOT > 0",
                f"VDOT = {vdot}"
            )
        
        # Test 2: Half Marathon
        half_marathon_data = {
            "performanceInput": {
                "recentRaceDistance": "Half Marathon",
                "recentRaceTime": "1:30:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", half_marathon_data)
        self.assert_test(
            response["status"] == 200 and response["data"].get("success") == True,
            "Pace Calculator - Half Marathon",
            {"status": 200, "success": True},
            {"status": response["status"], "success": response["data"].get("success")}
        )
        
        # Test 3: Custom distance
        custom_data = {
            "performanceInput": {
                "recentRaceDistance": "Custom",
                "recentRaceTime": "25:00",
                "customRaceDistanceValue": "6",
                "customRaceDistanceUnits": "km"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", custom_data)
        self.assert_test(
            response["status"] == 200 and response["data"].get("success") == True,
            "Pace Calculator - Custom distance",
            {"status": 200, "success": True},
            {"status": response["status"], "success": response["data"].get("success")}
        )
        
        # Test 4: Marathon
        marathon_data = {
            "performanceInput": {
                "recentRaceDistance": "Marathon",
                "recentRaceTime": "3:00:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", marathon_data)
        self.assert_test(
            response["status"] == 200 and response["data"].get("success") == True,
            "Pace Calculator - Marathon",
            {"status": 200, "success": True},
            {"status": response["status"], "success": response["data"].get("success")}
        )
        
        # Test 5: Missing time field (error case)
        missing_time_data = {
            "performanceInput": {
                "recentRaceDistance": "5k"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", missing_time_data)
        self.assert_test(
            response["status"] == 400,
            "Pace Calculator - Missing time field (400 error)",
            400,
            response["status"]
        )
        
        # Test 6: Invalid distance
        invalid_distance_data = {
            "performanceInput": {
                "recentRaceDistance": "invalid",
                "recentRaceTime": "20:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", invalid_distance_data)
        self.assert_test(
            response["status"] == 400,
            "Pace Calculator - Invalid distance (400 error)",
            400,
            response["status"]
        )
        
        # Test 7: Wrong HTTP method
        response = self.make_request("/api/pace-calculator", "GET")
        self.assert_test(
            response["status"] == 405,
            "Pace Calculator - Wrong HTTP method (405 error)",
            405,
            response["status"]
        )
        
        # Test 8: Fast time
        fast_time_data = {
            "performanceInput": {
                "recentRaceDistance": "5k",
                "recentRaceTime": "13:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", fast_time_data)
        self.assert_test(
            response["status"] == 200 and response["data"].get("success") == True,
            "Pace Calculator - Fast time",
            {"status": 200, "success": True},
            {"status": response["status"], "success": response["data"].get("success")}
        )
        
        # Test 9: Slow time
        slow_time_data = {
            "performanceInput": {
                "recentRaceDistance": "5k",
                "recentRaceTime": "40:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", slow_time_data)
        self.assert_test(
            response["status"] == 200 and response["data"].get("success") == True,
            "Pace Calculator - Slow time",
            {"status": 200, "success": True},
            {"status": response["status"], "success": response["data"].get("success")}
        )
    
    def test_protected_apis(self):
        """Test protected APIs that require authentication"""
        print("\n🔒 Testing Protected APIs (should return 401)")
        
        protected_endpoints = [
            {"endpoint": "/api/calendar", "method": "GET", "description": "Calendar API"},
            {
                "endpoint": "/api/training-plan/generate", 
                "method": "POST", 
                "description": "Training Plan Generation",
                "data": {
                    "planConfiguration": {
                        "raceName": "Test Race",
                        "raceDistance": "5k",
                        "raceDate": "2025-08-01",
                        "trainingPaces": {
                            "easyPace": {"minPerKm": 4862, "maxPerKm": 6077}
                        }
                    }
                }
            },
            {"endpoint": "/api/plan-analysis", "method": "GET", "description": "Plan Analysis API"},
            {
                "endpoint": "/api/workout/structure", 
                "method": "POST", 
                "description": "Workout Structure API",
                "data": {
                    "runType": "Easy",
                    "description": "Easy run",
                    "trainingPaces": {"easyPace": {"minPerKm": 4862, "maxPerKm": 6077}}
                }
            },
            {"endpoint": "/api/training-plan/crud", "method": "GET", "description": "Training Plan CRUD API"},
            {
                "endpoint": "/api/fit-workout/generate", 
                "method": "POST", 
                "description": "FIT Workout Generation API",
                "data": {
                    "scheduledRun": {
                        "date": "2025-06-15",
                        "dayOfWeek": 1,
                        "runType": "Easy",
                        "description": "Easy run"
                    }
                }
            }
        ]
        
        for endpoint_config in protected_endpoints:
            response = self.make_request(
                endpoint_config["endpoint"], 
                endpoint_config["method"], 
                endpoint_config.get("data")
            )
            self.assert_test(
                response["status"] == 401,
                f"{endpoint_config['description']} - Unauthorized (401)",
                401,
                response["status"]
            )
    
    def test_invalid_http_methods(self):
        """Test invalid HTTP methods"""
        print("\n🚫 Testing Invalid HTTP Methods")
        
        invalid_methods = [
            {"endpoint": "/api/pace-calculator", "method": "GET", "description": "Pace calculator with GET"},
            {"endpoint": "/api/pace-calculator", "method": "PUT", "description": "Pace calculator with PUT"},
            {"endpoint": "/api/pace-calculator", "method": "DELETE", "description": "Pace calculator with DELETE"},
            {"endpoint": "/api/calendar", "method": "POST", "description": "Calendar with POST"},
            {"endpoint": "/api/calendar", "method": "DELETE", "description": "Calendar with DELETE"}
        ]
        
        for test_case in invalid_methods:
            response = self.make_request(test_case["endpoint"], test_case["method"])
            # Calendar POST might return 401 (auth required) instead of 405
            expected_statuses = [405] if "/calendar" not in test_case["endpoint"] else [401, 405]
            self.assert_test(
                response["status"] in expected_statuses,
                f"{test_case['description']} - Method not allowed",
                f"One of {expected_statuses}",
                response["status"]
            )
    
    def test_nonexistent_endpoints(self):
        """Test non-existent endpoints"""
        print("\n🔍 Testing Non-existent Endpoints")
        
        nonexistent_endpoints = [
            "/api/nonexistent",
            "/api/fake-endpoint",
            "/api/pace-calculator/invalid",
            "/api/training-plan/nonexistent"
        ]
        
        for endpoint in nonexistent_endpoints:
            response = self.make_request(endpoint, "GET")
            self.assert_test(
                response["status"] == 404,
                f"{endpoint} - Not found (404)",
                404,
                response["status"]
            )
    
    def test_malformed_requests(self):
        """Test malformed requests"""
        print("\n⚠️  Testing Malformed Requests")
        
        # Test invalid JSON
        try:
            response = self.session.post(
                f"{self.base_url}/api/pace-calculator",
                data="invalid json",
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            self.assert_test(
                response.status_code == 400,
                "Invalid JSON - Bad request (400)",
                400,
                response.status_code
            )
        except requests.RequestException as e:
            self.assert_test(
                False,
                "Invalid JSON - Bad request (400)",
                400,
                f"Request failed: {str(e)}"
            )
        
        # Test empty request body
        response = self.make_request("/api/pace-calculator", "POST", {})
        self.assert_test(
            response["status"] == 400,
            "Empty request body - Bad request (400)",
            400,
            response["status"]
        )
    
    def test_performance(self):
        """Test API performance"""
        print("\n⚡ Testing Performance")
        
        start_time = time.time()
        valid_5k_data = {
            "performanceInput": {
                "recentRaceDistance": "5k",
                "recentRaceTime": "20:00"
            }
        }
        response = self.make_request("/api/pace-calculator", "POST", valid_5k_data)
        end_time = time.time()
        
        duration = (end_time - start_time) * 1000  # Convert to milliseconds
        
        self.assert_test(
            response["status"] == 200 and duration < 5000,
            "Pace Calculator response time < 5s",
            {"status": 200, "duration": "< 5000ms"},
            {"status": response["status"], "duration": f"{duration:.0f}ms"}
        )
        
        # Test concurrent requests
        print("   Testing concurrent requests...")
        import concurrent.futures
        
        def make_pace_request():
            return self.make_request("/api/pace-calculator", "POST", valid_5k_data)
        
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_pace_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        end_time = time.time()
        
        all_successful = all(r["status"] == 200 and r["data"].get("success") for r in responses)
        concurrent_duration = (end_time - start_time) * 1000
        
        self.assert_test(
            all_successful and concurrent_duration < 10000,
            "5 concurrent requests successful < 10s",
            {"all_successful": True, "duration": "< 10000ms"},
            {"all_successful": all_successful, "duration": f"{concurrent_duration:.0f}ms"}
        )
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Stridr API Test Suite (Python)")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        start_time = time.time()
        
        self.test_server_health()
        self.test_pace_calculator_api()
        self.test_protected_apis()
        self.test_invalid_http_methods()
        self.test_nonexistent_endpoints()
        self.test_malformed_requests()
        self.test_performance()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Calculate results
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests
        
        print("\n" + "=" * 50)
        print("📊 Test Results Summary")
        print("=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⏱️  Duration: {duration:.2f}s")
        
        if total_tests > 0:
            success_rate = (passed_tests / total_tests) * 100
            print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.results:
                if not result.passed:
                    print(f"  - {result.test_name}")
                    if result.error_message:
                        print(f"    Error: {result.error_message}")
            return False
        else:
            print("\n🎉 All tests passed!")
            return True

def main():
    """Main function"""
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    
    tester = StridrAPITester(base_url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
