import { NextRequest, NextResponse } from 'next/server';
import { generateTrainingPlan, PlanConfiguration } from '@/lib/planGenerator';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log("--- API Route: /api/training-plan/generate ---");
  console.log("Received request at:", new Date().toISOString());

  // Check for Authorization header first (for API requests)
  const authHeader = request.headers.get('authorization');
  let supabase;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use Bearer token authentication for API requests
    const token = authHeader.substring(7);
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
  } else {
    // Fall back to cookie-based authentication for browser requests
    const cookieStore = await cookies();
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
  }

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
  }

  try {
    // Parse and validate request body
    const planConfig = (await request.json()) as PlanConfiguration;

    if (!planConfig || !planConfig.raceDate || !planConfig.trainingPaces) {
      return NextResponse.json({ error: 'Invalid plan configuration provided.' }, { status: 400 });
    }

    // Generate the training plan
    const trainingPlan = generateTrainingPlan(planConfig);

    if (!trainingPlan) {
      return NextResponse.json({ error: 'Failed to generate training plan based on the provided inputs.' }, { status: 500 });
    }

    // Save the training plan to database
    const userId = user.id;
    console.log(`Attempting to save plan for user: ${userId}`);
    
    // 1. Insert main training plan
    const { data: savedPlanData, error: planSaveError } = await supabase
      .from('user_training_plans')
      .insert({
        user_id: userId,
        plan_name: trainingPlan.planConfiguration.raceName || 'My Training Plan',
        race_distance: trainingPlan.planConfiguration.raceDistance,
        custom_race_distance_value: trainingPlan.planConfiguration.customRaceDistanceValue,
        custom_race_distance_units: trainingPlan.planConfiguration.customRaceDistanceUnits,
        race_date: trainingPlan.planConfiguration.raceDate,
        training_paces: trainingPlan.planConfiguration.trainingPaces,
        total_weeks: trainingPlan.totalWeeks,
        plan_start_date: trainingPlan.startDate,
        plan_end_date: trainingPlan.endDate,
      })
      .select()
      .single();

    if (planSaveError || !savedPlanData) {
      console.error('Error saving main training plan:', planSaveError);
      return NextResponse.json({ error: 'Failed to save main training plan to database.', details: planSaveError?.message }, { status: 500 });
    }

    const trainingPlanId = savedPlanData.id;
    console.log(`Successfully saved main plan. Plan ID: ${trainingPlanId}`);

    // 2. Insert weekly schedules and their runs
    for (const week of trainingPlan.weeklySchedules) {
      console.log(`Saving week ${week.weekNumber} for plan ${trainingPlanId}`);
      const { data: savedWeekData, error: weekSaveError } = await supabase
        .from('plan_weekly_schedules')
        .insert({
          training_plan_id: trainingPlanId,
          week_number: week.weekNumber,
          start_date: week.startDate,
          end_date: week.endDate,
          summary: week.summary,
        })
        .select()
        .single();

      if (weekSaveError || !savedWeekData) {
        console.error(`Error saving week ${week.weekNumber} for plan ${trainingPlanId}:`, weekSaveError);
        return NextResponse.json({ error: `Failed to save week ${week.weekNumber}.`, details: weekSaveError?.message }, { status: 500 });
      }

      const weeklyScheduleId = savedWeekData.id;

      const runsToInsert = week.runs
        .filter(run => run.runType !== 'Rest')
        .map(run => ({
          weekly_schedule_id: weeklyScheduleId,
          training_plan_id: trainingPlanId,
          user_id: userId,
          run_date: run.date,
          day_of_week: run.dayOfWeek,
          run_type: run.runType.toString(),
          description: run.description,
          total_duration_seconds: run.totalDuration,
          total_distance_meters: run.totalDistance,
          workout_steps: run.steps || null,
          notes: run.notes,
        }));

      if (runsToInsert.length > 0) {
        console.log(`Saving ${runsToInsert.length} runs for week ${week.weekNumber}`);
        const { error: runsSaveError } = await supabase
          .from('plan_scheduled_runs')
          .insert(runsToInsert);

        if (runsSaveError) {
          console.error(`Error saving runs for week ${week.weekNumber}:`, runsSaveError);
          return NextResponse.json({ error: `Failed to save runs for week ${week.weekNumber}.`, details: runsSaveError?.message }, { status: 500 });
        }
        console.log(`Successfully saved runs for week ${week.weekNumber}`);
      }
    }

    console.log("Training plan saved successfully.");
    return NextResponse.json({ 
      message: 'Training plan generated and saved successfully.', 
      trainingPlanId: trainingPlanId, 
      generatedPlan: trainingPlan 
    }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/training-plan/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while generating the plan.';
    return NextResponse.json({ 
      error: 'Failed to process plan generation request.', 
      details: errorMessage 
    }, { status: 500 });
  }
}

// Client-side fetch example (to be used in your component or page)
// Note: This code is for demonstration and should be adapted to your actual component/page code.
// 
// const access_token = 'your_access_token_here'; // Obtain the access token from your authentication flow
// const planConfig = { 
//   raceDate: '2023-12-10', 
//   trainingPaces: { /* your training paces */ },
//   /* other configuration options */
// };
//
// const response = await fetch('/api/training-plan/generate', {
//   method: 'POST',
//   headers: {
//     'Authorization': `Bearer ${access_token}`,
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify(planConfig)
// });
//
// const result = await response.json();
// console.log('API response:', result);