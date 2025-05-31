# API-First Architecture Documentation

This document outlines the modular, loosely coupled API architecture for the Stridr training application.

## Overview

The application follows an API-first approach with each core functionality separated into independent, reusable services. This architecture provides:

- **Modularity**: Each service handles a specific domain
- **Reusability**: Services can be used by multiple frontend components
- **Testability**: Individual services can be tested in isolation
- **Scalability**: Services can be scaled independently
- **Maintainability**: Clear separation of concerns

## API Endpoints

### 1. Pace Calculator Service
**Endpoint**: `/api/pace-calculator`

**Purpose**: Calculate training paces based on recent race performance using VDOT methodology.

**Methods**:
- `POST`: Calculate paces from performance data
- `GET`: Calculate paces from URL parameters

**Request Body (POST)**:
```json
{
  "performanceInput": {
    "recentRaceDistance": "5k",
    "recentRaceTime": "22:30",
    "customRaceDistanceValue": "3.5", // Optional for custom distances
    "customRaceDistanceUnits": "km"    // Optional for custom distances
  }
}
```

**Response**:
```json
{
  "success": true,
  "trainingPaces": {
    "easy": { "min": 5, "sec": 30 },
    "marathon": { "min": 4, "sec": 45 },
    "threshold": { "min": 4, "sec": 15 },
    "interval": { "min": 3, "sec": 50 },
    "recovery": { "min": 6, "sec": 0 }
  }
}
```

### 2. Workout Structure Service
**Endpoint**: `/api/workout/structure`

**Purpose**: Convert high-level run definitions into detailed workout steps (similar to Garmin FIT format).

**Method**: `POST`

**Request Body**:
```json
{
  "runType": "Interval",
  "distance": 8000, // Optional: total distance in meters
  "duration": 3600, // Optional: total duration in seconds
  "description": "6 x 800m intervals",
  "trainingPaces": {
    "easy": { "min": 5, "sec": 30 },
    "threshold": { "min": 4, "sec": 15 },
    "interval": { "min": 3, "sec": 50 },
    "recovery": { "min": 6, "sec": 0 }
  },
  "intensity": "hard" // Optional: easy, moderate, hard
}
```

**Response**:
```json
{
  "success": true,
  "workoutSteps": [
    {
      "stepType": "warmup",
      "description": "Warm-up",
      "durationType": "time",
      "durationValue": 900, // 15 minutes in seconds
      "targetType": "pace",
      "targetValueLow": 3.5,  // meters per second
      "targetValueHigh": 4.0,
      "intensity": "easy"
    }
    // ... more steps
  ],
  "estimatedDuration": 3600 // Total estimated duration in seconds
}
```

### 3. FIT File Generator Service
**Endpoint**: `/api/fit-workout/generate`

**Purpose**: Generate Garmin FIT workout files from structured workout data.

**Method**: `POST`

**Request Body**:
```json
{
  "scheduledRun": {
    "date": "2025-06-01",
    "runType": "Interval",
    "description": "6 x 800m intervals",
    "distance": 8000,
    "duration": 3600,
    "workoutSteps": [/* array of WorkoutStep objects */]
  },
  "targetDirectory": "/path/to/save" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "fitFileBuffer": "...", // Base64 encoded FIT file data
  "filename": "20250601_interval.fit"
}
```

### 4. Training Plan CRUD Service
**Endpoint**: `/api/training-plan/crud`

**Purpose**: Complete CRUD operations for training plans.

**Methods**:
- `GET`: Retrieve user's training plans or a specific plan
- `POST`: Create a new training plan
- `PUT`: Update an existing training plan
- `DELETE`: Delete a training plan

**GET Request**:
```
GET /api/training-plan/crud?planId=123  // Get specific plan
GET /api/training-plan/crud             // Get all user plans
```

**POST Request Body**:
```json
{
  "plan": {
    "planName": "Marathon Training",
    "raceDistance": "Marathon",
    "raceDate": "2025-10-15",
    "raceGoalTime": "3:30:00",
    "currentFitnessLevel": "intermediate",
    "trainingPaces": { /* TrainingPaces object */ },
    "weeklySchedules": [ /* array of WeeklySchedule objects */ ]
  }
}
```

### 5. Training Plan Generation Service
**Endpoint**: `/api/training-plan/generate`

**Purpose**: Generate and save complete training plans based on user configuration.

**Method**: `POST`

**Request Body**:
```json
{
  "raceName": "Boston Marathon",
  "raceDistance": "Marathon",
  "customRaceDistanceValue": "", // For custom distances
  "customRaceDistanceUnits": "km",
  "raceDate": "2025-10-15",
  "trainingPaces": { /* TrainingPaces object */ }
}
```

### 6. Calendar Integration Service
**Endpoint**: `/api/calendar`

**Purpose**: Manage calendar events for training runs and integrate with calendar UI.

**Methods**:
- `GET`: Retrieve calendar events for a date range
- `POST`: Update run completion status or add custom events
- `PUT`: Modify scheduled runs (change date, distance, etc.)

**GET Request**:
```
GET /api/calendar?startDate=2025-06-01&endDate=2025-06-30&planId=123
```

**Response**:
```json
{
  "success": true,
  "events": [
    {
      "id": "run_123",
      "title": "Easy - 8.0km",
      "start": "2025-06-01T07:00:00Z",
      "end": "2025-06-01T07:45:00Z",
      "description": "Easy recovery run",
      "type": "run",
      "runType": "Easy",
      "distance": 8000,
      "completed": false,
      "backgroundColor": "#10B98180",
      "borderColor": "#05966980"
    }
  ]
}
```

### 7. Plan Analysis Service
**Endpoint**: `/api/plan-analysis`

**Purpose**: Analyze training plans for insights, progress tracking, and plan comparison.

**Methods**:
- `GET`: Analyze a single training plan
- `POST`: Compare two training plans

**GET Request**:
```
GET /api/plan-analysis?planId=123&includeCompletion=true
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "totalDistance": 450.5,
    "totalRuns": 72,
    "weeklyAverages": {
      "distance": 37.5,
      "runs": 6,
      "easyRuns": 4,
      "hardRuns": 2
    },
    "runTypeDistribution": {
      "easy": 48,
      "tempo": 12,
      "interval": 8,
      "long": 4
    },
    "progressionAnalysis": {
      "peakWeek": 8,
      "peakDistance": 65.0,
      "buildupRate": 5.2,
      "taperWeeks": 3
    },
    "completionStats": {
      "totalCompleted": 45,
      "completionRate": 62.5,
      "avgCompletedDistance": 7.8,
      "streakDays": 5
    }
  }
}
```

## Data Flow Architecture

```
Frontend Components
       ↓
API Gateway Layer (/api/*)
       ↓
Service Layer (Individual API endpoints)
       ↓
Business Logic Layer (lib/ functions)
       ↓
Data Access Layer (Supabase)
       ↓
Database (PostgreSQL)
```

## Authentication

All API endpoints require authentication via Supabase session cookies. The authentication flow:

1. User authenticates via AuthContext
2. Supabase session established with cookies
3. API routes verify session using `createRouteHandlerClient`
4. User ID extracted for data isolation

## Error Handling

Consistent error response format across all endpoints:

```json
{
  "error": "Descriptive error message",
  "success": false
}
```

HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (resource doesn't exist)
- `405`: Method Not Allowed
- `500`: Internal Server Error

## Usage Examples

### Frontend Integration

```typescript
// Calculate training paces
const paceResponse = await fetch('/api/pace-calculator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ performanceInput })
});

// Generate workout structure
const workoutResponse = await fetch('/api/workout/structure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ runType, trainingPaces })
});

// Create FIT file
const fitResponse = await fetch('/api/fit-workout/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scheduledRun })
});
```

### Service Composition

Services can be composed to build complex workflows:

1. **Plan Generation Workflow**:
   - Calculate paces → Generate plan → Structure workouts → Save to database

2. **Workout Creation Workflow**:
   - Structure workout → Generate FIT file → Schedule in calendar

3. **Progress Analysis Workflow**:
   - Retrieve completed runs → Analyze progress → Generate insights

## Benefits of This Architecture

1. **Modularity**: Each service has a single responsibility
2. **Testability**: Services can be unit tested independently
3. **Reusability**: Same APIs used by web, mobile, or external clients
4. **Scalability**: Individual services can be optimized or scaled
5. **Maintenance**: Clear boundaries make debugging and updates easier
6. **API-First**: External integrations and future platforms supported
7. **Type Safety**: TypeScript interfaces ensure data consistency

## Future Enhancements

1. **Caching Layer**: Add Redis for frequently accessed data
2. **Rate Limiting**: Implement request throttling
3. **API Versioning**: Support multiple API versions
4. **Webhooks**: Real-time notifications for plan updates
5. **Batch Operations**: Support multiple operations in single request
6. **External Integrations**: Garmin Connect, Strava, etc.
7. **Microservices**: Split into separate deployable services
