import { NextRequest, NextResponse } from 'next/server';
import { createAPIClient } from '@/lib/supabase-server';
import { WorkoutStep, ScheduledRun } from '@/lib/planGenerator';

interface FitGenerationRequest {
  scheduledRun: ScheduledRun;
  targetDirectory?: string;
}

interface FitGenerationResponse {
  success: boolean;
  fitFileBuffer?: Buffer;
  filename?: string;
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

    const body: FitGenerationRequest = await request.json();
    const { scheduledRun, targetDirectory } = body;

    if (!scheduledRun) {
      return NextResponse.json(
        { error: 'Scheduled run data is required' },
        { status: 400 }
      );
    }

    // Generate FIT file based on workout steps
    const fitFileBuffer = await generateFitWorkout(scheduledRun);
    const filename = `${scheduledRun.date.replace(/[:\-]/g, '')}_${scheduledRun.runType.toLowerCase()}.fit`;

    return NextResponse.json<FitGenerationResponse>({
      success: true,
      fitFileBuffer: fitFileBuffer,
      filename
    });

  } catch (error) {
    console.error('FIT generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate FIT file' },
      { status: 500 }
    );
  }
}

async function generateFitWorkout(scheduledRun: ScheduledRun): Promise<Buffer> {
  // Basic FIT file structure for a workout
  const workoutData = {
    name: `${scheduledRun.runType} - ${scheduledRun.description}`,
    steps: scheduledRun.workoutSteps.map((step, index) => ({
      stepId: index + 1,
      durationType: step.durationType,
      durationValue: step.durationValue,
      targetType: step.targetType,
      targetValueLow: step.targetValueLow,
      targetValueHigh: step.targetValueHigh,
      intensity: step.intensity
    })),
    estimatedDuration: scheduledRun.workoutSteps.reduce((total, step) => {
      if (step.durationType === 'time') {
        return total + (step.durationValue || 0);
      }
      // For distance-based steps, estimate time based on pace
      return total + estimateTimeFromDistance(step.durationValue || 0, step.targetValueLow || 0);
    }, 0)
  };

  // Convert to FIT file format (simplified version)
  // In a real implementation, you'd use a proper FIT SDK
  const fitData = JSON.stringify(workoutData);
  return Buffer.from(fitData, 'utf-8');
}

function estimateTimeFromDistance(distance: number, pace: number): number {
  // Estimate time in seconds: distance (meters) / pace (m/s)
  return distance / (pace || 1);
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate FIT files.' },
    { status: 405 }
  );
}
