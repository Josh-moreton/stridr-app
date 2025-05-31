import { NextRequest, NextResponse } from 'next/server';
import { createAPIClient } from '@/lib/supabase-server';
import { WorkoutStep, RunType, ScheduledRun } from '@/lib/planGenerator';
import { TrainingPaces } from '@/lib/paceCalculator';

interface WorkoutStructureRequest {
  runType: RunType;
  distance?: number;
  duration?: number;
  description: string;
  trainingPaces: TrainingPaces;
  intensity?: 'easy' | 'moderate' | 'hard';
}

interface WorkoutStructureResponse {
  success: boolean;
  workoutSteps?: WorkoutStep[];
  estimatedDuration?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createAPIClient(request);
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    const body: WorkoutStructureRequest = await request.json();
    const { runType, distance, duration, description, trainingPaces, intensity } = body;

    if (!runType || !trainingPaces) {
      return NextResponse.json(
        { error: 'Run type and training paces are required' },
        { status: 400 }
      );
    }

    const workoutSteps = generateWorkoutSteps(runType, distance, duration, description, trainingPaces, intensity);
    const estimatedDuration = calculateEstimatedDuration(workoutSteps);

    return NextResponse.json<WorkoutStructureResponse>({
      success: true,
      workoutSteps,
      estimatedDuration
    });

  } catch (error) {
    console.error('Workout structuring error:', error);
    return NextResponse.json(
      { error: 'Failed to structure workout' },
      { status: 500 }
    );
  }
}

function generateWorkoutSteps(
  runType: RunType,
  distance?: number,
  duration?: number,
  description?: string,
  trainingPaces?: TrainingPaces,
  intensity?: 'easy' | 'moderate' | 'hard'
): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  
  switch (runType) {
    case 'Easy':
      steps.push({
        stepType: 'run',
        description: description || 'Easy run',
        durationType: distance ? 'distance' : 'time',
        durationValue: distance ? distance * 1000 : (duration || 30) * 60, // Convert to meters or seconds
        targetType: 'pace',
        targetValueLow: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) : 3.5,
        targetValueHigh: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) * 1.1 : 4.0,
        intensity: 'easy'
      });
      break;

    case 'Tempo':
      // Warm-up
      steps.push({
        stepType: 'warmup',
        description: 'Warm-up',
        durationType: 'time',
        durationValue: 10 * 60, // 10 minutes
        targetType: 'pace',
        targetValueLow: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) : 3.5,
        targetValueHigh: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) * 1.1 : 4.0,
        intensity: 'easy'
      });

      // Main tempo portion
      steps.push({
        stepType: 'run',
        description: 'Tempo run',
        durationType: distance ? 'distance' : 'time',
        durationValue: distance ? distance * 1000 : (duration || 20) * 60,
        targetType: 'pace',
        targetValueLow: trainingPaces?.threshold ? paceToMetersPerSecond(trainingPaces.threshold) : 4.5,
        targetValueHigh: trainingPaces?.threshold ? paceToMetersPerSecond(trainingPaces.threshold) * 1.05 : 4.8,
        intensity: 'moderate'
      });

      // Cool-down
      steps.push({
        stepType: 'cooldown',
        description: 'Cool-down',
        durationType: 'time',
        durationValue: 10 * 60, // 10 minutes
        targetType: 'pace',
        targetValueLow: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) : 3.5,
        targetValueHigh: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) * 1.1 : 4.0,
        intensity: 'easy'
      });
      break;

    case 'Interval':
      // Warm-up
      steps.push({
        stepType: 'warmup',
        description: 'Warm-up',
        durationType: 'time',
        durationValue: 15 * 60, // 15 minutes
        targetType: 'pace',
        targetValueLow: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) : 3.5,
        targetValueHigh: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) * 1.1 : 4.0,
        intensity: 'easy'
      });

      // Intervals (example: 6 x 800m)
      for (let i = 0; i < 6; i++) {
        // Work interval
        steps.push({
          stepType: 'interval',
          description: `Interval ${i + 1}`,
          durationType: 'distance',
          durationValue: 800, // 800 meters
          targetType: 'pace',
          targetValueLow: trainingPaces?.interval ? paceToMetersPerSecond(trainingPaces.interval) : 5.0,
          targetValueHigh: trainingPaces?.interval ? paceToMetersPerSecond(trainingPaces.interval) * 1.03 : 5.2,
          intensity: 'hard'
        });

        // Recovery between intervals (except after last one)
        if (i < 5) {
          steps.push({
            stepType: 'recovery',
            description: `Recovery ${i + 1}`,
            durationType: 'distance',
            durationValue: 400, // 400 meters
            targetType: 'pace',
            targetValueLow: trainingPaces?.recovery ? paceToMetersPerSecond(trainingPaces.recovery) : 3.0,
            targetValueHigh: trainingPaces?.recovery ? paceToMetersPerSecond(trainingPaces.recovery) * 1.2 : 3.8,
            intensity: 'easy'
          });
        }
      }

      // Cool-down
      steps.push({
        stepType: 'cooldown',
        description: 'Cool-down',
        durationType: 'time',
        durationValue: 15 * 60, // 15 minutes
        targetType: 'pace',
        targetValueLow: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) : 3.5,
        targetValueHigh: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) * 1.1 : 4.0,
        intensity: 'easy'
      });
      break;

    case 'Long':
      steps.push({
        stepType: 'run',
        description: description || 'Long run',
        durationType: distance ? 'distance' : 'time',
        durationValue: distance ? distance * 1000 : (duration || 90) * 60,
        targetType: 'pace',
        targetValueLow: trainingPaces?.easy ? paceToMetersPerSecond(trainingPaces.easy) * 0.95 : 3.3,
        targetValueHigh: trainingPaces?.marathon ? paceToMetersPerSecond(trainingPaces.marathon) : 4.2,
        intensity: intensity || 'easy'
      });
      break;

    default:
      throw new Error(`Unsupported run type: ${runType}`);
  }

  return steps;
}

function paceToMetersPerSecond(pace: { min: number; sec: number }): number {
  // Convert pace (min:sec per km) to meters per second
  const totalSeconds = pace.min * 60 + pace.sec;
  return 1000 / totalSeconds; // meters per second
}

function calculateEstimatedDuration(steps: WorkoutStep[]): number {
  return steps.reduce((total, step) => {
    if (step.durationType === 'time') {
      return total + (step.durationValue || 0);
    } else if (step.durationType === 'distance') {
      // Estimate time based on target pace
      const avgPace = ((step.targetValueLow || 0) + (step.targetValueHigh || 0)) / 2;
      return total + (step.durationValue || 0) / avgPace;
    }
    return total;
  }, 0);
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to structure workouts.' },
    { status: 405 }
  );
}
