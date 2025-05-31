#!/bin/bash

# Stridr API Test Suite - Bash Script
# Simple curl-based testing for quick validation

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0
TOTAL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
declare -a FAILED_TESTS=()

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Assert function
assert() {
    local condition=$1
    local test_name="$2"
    local expected="$3"
    local actual="$4"
    
    ((TOTAL++))
    
    if [ "$condition" = "true" ]; then
        ((PASSED++))
        log_success "$test_name"
    else
        ((FAILED++))
        log_error "$test_name"
        log_error "  Expected: $expected"
        log_error "  Actual: $actual"
        FAILED_TESTS+=("$test_name")
    fi
}

# Helper function to make requests and extract status code
make_request() {
    local url="$1"
    local method="$2"
    local data="$3"
    local expected_status="$4"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$url")
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    # Extract body (everything except last 3 characters)
    body="${response%???}"
    
    echo "$status_code"
}

# Test server health
test_server_health() {
    log_info "Testing server health..."
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
    assert "$([ "$status" != "000" ] && echo true || echo false)" \
           "Server is responding" \
           "HTTP response" \
           "Status: $status"
}

# Test Pace Calculator API
test_pace_calculator() {
    log_info "Testing Pace Calculator API..."
    
    # Test 1: Valid 5K input
    valid_5k='{"performanceInput":{"recentRaceDistance":"5k","recentRaceTime":"20:00"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$valid_5k")
    assert "$([ "$status" = "200" ] && echo true || echo false)" \
           "Pace Calculator - Valid 5K input" \
           "200" \
           "$status"
    
    # Test 2: Half Marathon
    half_marathon='{"performanceInput":{"recentRaceDistance":"Half Marathon","recentRaceTime":"1:30:00"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$half_marathon")
    assert "$([ "$status" = "200" ] && echo true || echo false)" \
           "Pace Calculator - Half Marathon" \
           "200" \
           "$status"
    
    # Test 3: Custom distance
    custom_distance='{"performanceInput":{"recentRaceDistance":"Custom","recentRaceTime":"25:00","customRaceDistanceValue":"6","customRaceDistanceUnits":"km"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$custom_distance")
    assert "$([ "$status" = "200" ] && echo true || echo false)" \
           "Pace Calculator - Custom distance" \
           "200" \
           "$status"
    
    # Test 4: Missing time field
    missing_time='{"performanceInput":{"recentRaceDistance":"5k"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$missing_time")
    assert "$([ "$status" = "400" ] && echo true || echo false)" \
           "Pace Calculator - Missing time (400 error)" \
           "400" \
           "$status"
    
    # Test 5: Invalid distance
    invalid_distance='{"performanceInput":{"recentRaceDistance":"invalid","recentRaceTime":"20:00"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$invalid_distance")
    assert "$([ "$status" = "400" ] && echo true || echo false)" \
           "Pace Calculator - Invalid distance (400 error)" \
           "400" \
           "$status"
    
    # Test 6: Wrong HTTP method
    status=$(make_request "$BASE_URL/api/pace-calculator" "GET")
    assert "$([ "$status" = "405" ] && echo true || echo false)" \
           "Pace Calculator - Wrong method (405 error)" \
           "405" \
           "$status"
    
    # Test 7: Fast time
    fast_time='{"performanceInput":{"recentRaceDistance":"5k","recentRaceTime":"13:00"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$fast_time")
    assert "$([ "$status" = "200" ] && echo true || echo false)" \
           "Pace Calculator - Fast time" \
           "200" \
           "$status"
    
    # Test 8: Slow time
    slow_time='{"performanceInput":{"recentRaceDistance":"5k","recentRaceTime":"40:00"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$slow_time")
    assert "$([ "$status" = "200" ] && echo true || echo false)" \
           "Pace Calculator - Slow time" \
           "200" \
           "$status"
}

# Test protected APIs
test_protected_apis() {
    log_info "Testing protected APIs (should return 401)..."
    
    # Calendar API
    status=$(make_request "$BASE_URL/api/calendar" "GET")
    assert "$([ "$status" = "401" ] && echo true || echo false)" \
           "Calendar API - Unauthorized (401)" \
           "401" \
           "$status"
    
    # Training Plan Generation
    plan_data='{"planConfiguration":{"raceName":"Test","raceDistance":"5k","raceDate":"2025-08-01","trainingPaces":{"easyPace":{"minPerKm":4862,"maxPerKm":6077}}}}'
    status=$(make_request "$BASE_URL/api/training-plan/generate" "POST" "$plan_data")
    assert "$([ "$status" = "401" ] && echo true || echo false)" \
           "Training Plan Generation - Unauthorized (401)" \
           "401" \
           "$status"
    
    # Plan Analysis
    status=$(make_request "$BASE_URL/api/plan-analysis" "GET")
    assert "$([ "$status" = "401" ] && echo true || echo false)" \
           "Plan Analysis - Unauthorized (401)" \
           "401" \
           "$status"
    
    # Workout Structure
    workout_data='{"runType":"Easy","description":"Easy run","trainingPaces":{"easyPace":{"minPerKm":4862,"maxPerKm":6077}}}'
    status=$(make_request "$BASE_URL/api/workout/structure" "POST" "$workout_data")
    assert "$([ "$status" = "401" ] && echo true || echo false)" \
           "Workout Structure - Unauthorized (401)" \
           "401" \
           "$status"
    
    # Training Plan CRUD
    status=$(make_request "$BASE_URL/api/training-plan/crud" "GET")
    assert "$([ "$status" = "401" ] && echo true || echo false)" \
           "Training Plan CRUD - Unauthorized (401)" \
           "401" \
           "$status"
    
    # FIT Workout Generation
    fit_data='{"scheduledRun":{"date":"2025-06-15","dayOfWeek":1,"runType":"Easy","description":"Easy run"}}'
    status=$(make_request "$BASE_URL/api/fit-workout/generate" "POST" "$fit_data")
    assert "$([ "$status" = "401" ] && echo true || echo false)" \
           "FIT Workout Generation - Unauthorized (401)" \
           "401" \
           "$status"
}

# Test invalid HTTP methods
test_invalid_methods() {
    log_info "Testing invalid HTTP methods..."
    
    # Pace calculator with wrong methods
    status=$(make_request "$BASE_URL/api/pace-calculator" "PUT")
    assert "$([ "$status" = "405" ] && echo true || echo false)" \
           "Pace Calculator PUT - Method not allowed (405)" \
           "405" \
           "$status"
    
    status=$(make_request "$BASE_URL/api/pace-calculator" "DELETE")
    assert "$([ "$status" = "405" ] && echo true || echo false)" \
           "Pace Calculator DELETE - Method not allowed (405)" \
           "405" \
           "$status"
    
    # Calendar with wrong methods
    status=$(make_request "$BASE_URL/api/calendar" "POST")
    assert "$([ "$status" = "401" -o "$status" = "405" ] && echo true || echo false)" \
           "Calendar POST - Unauthorized or Method not allowed" \
           "401 or 405" \
           "$status"
}

# Test non-existent endpoints
test_nonexistent_endpoints() {
    log_info "Testing non-existent endpoints..."
    
    endpoints=(
        "/api/nonexistent"
        "/api/fake-endpoint" 
        "/api/pace-calculator/invalid"
        "/api/training-plan/nonexistent"
    )
    
    for endpoint in "${endpoints[@]}"; do
        status=$(make_request "$BASE_URL$endpoint" "GET")
        assert "$([ "$status" = "404" ] && echo true || echo false)" \
               "Non-existent endpoint $endpoint (404)" \
               "404" \
               "$status"
    done
}

# Test malformed requests
test_malformed_requests() {
    log_info "Testing malformed requests..."
    
    # Invalid JSON
    response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" \
               -d "invalid json" "$BASE_URL/api/pace-calculator")
    status="${response: -3}"
    assert "$([ "$status" = "400" ] && echo true || echo false)" \
           "Invalid JSON - Bad request (400)" \
           "400" \
           "$status"
    
    # Empty request body
    response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" \
               -d "{}" "$BASE_URL/api/pace-calculator")
    status="${response: -3}"
    assert "$([ "$status" = "400" ] && echo true || echo false)" \
           "Empty request body - Bad request (400)" \
           "400" \
           "$status"
}

# Performance test
test_performance() {
    log_info "Testing API performance..."
    
    # Measure response time for pace calculator
    start_time=$(date +%s%3N)
    valid_5k='{"performanceInput":{"recentRaceDistance":"5k","recentRaceTime":"20:00"}}'
    status=$(make_request "$BASE_URL/api/pace-calculator" "POST" "$valid_5k")
    end_time=$(date +%s%3N)
    
    duration=$((end_time - start_time))
    
    assert "$([ "$status" = "200" -a "$duration" -lt 5000 ] && echo true || echo false)" \
           "Pace Calculator response time < 5s" \
           "200 status and < 5000ms" \
           "Status: $status, Duration: ${duration}ms"
}

# Main test runner
main() {
    echo "🚀 Starting Stridr API Test Suite (Bash)"
    echo "Testing against: $BASE_URL"
    echo "=================================================="
    
    start_time=$(date +%s)
    
    test_server_health
    test_pace_calculator
    test_protected_apis
    test_invalid_methods
    test_nonexistent_endpoints
    test_malformed_requests
    test_performance
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo ""
    echo "=================================================="
    echo "📊 Test Results Summary"
    echo "=================================================="
    echo "Total Tests: $TOTAL"
    echo "✅ Passed: $PASSED"
    echo "❌ Failed: $FAILED"
    echo "⏱️  Duration: ${duration}s"
    
    if [ $TOTAL -gt 0 ]; then
        success_rate=$((PASSED * 100 / TOTAL))
        echo "📈 Success Rate: ${success_rate}%"
    fi
    
    if [ $FAILED -gt 0 ]; then
        echo ""
        log_error "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        exit 1
    else
        log_success "All tests passed! 🎉"
        exit 0
    fi
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
