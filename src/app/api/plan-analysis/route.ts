import { NextRequest, NextResponse } from 'next/server';
import { createAPIClient } from '@/lib/supabase-server';

interface AnalysisResponse {
  success: boolean;
  analysis?: {
    totalDistance: number;
    totalRuns: number;
    weeklyAverages: {
      distance: number;
      runs: number;
      easyRuns: number;
      hardRuns: number;
    };
    runTypeDistribution: {
      easy: number;
      tempo: number;
      interval: number;
      long: number;
    };
    progressionAnalysis: {
      peakWeek: number;
      peakDistance: number;
      buildupRate: number;
      taperWeeks: number;
    };
    completionStats?: {
      totalCompleted: number;
      completionRate: number;
      avgCompletedDistance: number;
      streakDays: number;
    };
  };
  error?: string;
}

interface CompareRequest {
  planId1: string;
  planId2: string;
}

// GET /api/plan-analysis - Analyze a training plan
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const includeCompletion = searchParams.get('includeCompletion') === 'true';

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Fetch plan data with all runs
    const { data: planData, error: planError } = await supabase
      .from('user_training_plans')
      .select(`
        *,
        plan_weekly_schedules (
          week_number,
          total_distance,
          plan_scheduled_runs (
            date,
            run_type,
            distance,
            duration,
            completed,
            actual_distance,
            completed_at
          )
        )
      `)
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError) {
      console.error('Error fetching plan for analysis:', planError);
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Analyze the plan
    const analysis = analyzePlan(planData, includeCompletion);

    return NextResponse.json<AnalysisResponse>({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error in GET /api/plan-analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/plan-analysis - Compare two training plans
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

    const body: CompareRequest = await request.json();
    const { planId1, planId2 } = body;

    if (!planId1 || !planId2) {
      return NextResponse.json(
        { error: 'Two plan IDs are required for comparison' },
        { status: 400 }
      );
    }

    // Fetch both plans
    const { data: plansData, error: plansError } = await supabase
      .from('user_training_plans')
      .select(`
        *,
        plan_weekly_schedules (
          week_number,
          total_distance,
          plan_scheduled_runs (
            date,
            run_type,
            distance,
            duration,
            completed,
            actual_distance
          )
        )
      `)
      .in('id', [planId1, planId2])
      .eq('user_id', user.id);

    if (plansError || !plansData || plansData.length !== 2) {
      console.error('Error fetching plans for comparison:', plansError);
      return NextResponse.json(
        { error: 'Could not fetch both plans for comparison' },
        { status: 404 }
      );
    }

    const analysis1 = analyzePlan(plansData[0], true);
    const analysis2 = analyzePlan(plansData[1], true);

    const comparison = {
      plan1: {
        id: planId1,
        name: plansData[0].plan_name,
        analysis: analysis1
      },
      plan2: {
        id: planId2,
        name: plansData[1].plan_name,
        analysis: analysis2
      },
      differences: {
        totalDistance: analysis1.totalDistance - analysis2.totalDistance,
        totalRuns: analysis1.totalRuns - analysis2.totalRuns,
        avgWeeklyDistance: analysis1.weeklyAverages.distance - analysis2.weeklyAverages.distance,
        peakDistance: analysis1.progressionAnalysis.peakDistance - analysis2.progressionAnalysis.peakDistance,
        completionRate: (analysis1.completionStats?.completionRate || 0) - (analysis2.completionStats?.completionRate || 0)
      }
    };

    return NextResponse.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('Error in POST /api/plan-analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function analyzePlan(planData: any, includeCompletion: boolean = false) {
  const weeks = planData.plan_weekly_schedules || [];
  const allRuns = weeks.flatMap((week: any) => week.plan_scheduled_runs || []);

  // Basic statistics
  const totalDistance = allRuns.reduce((sum: number, run: any) => sum + (run.distance || 0), 0) / 1000; // Convert to km
  const totalRuns = allRuns.length;

  // Weekly averages
  const weeklyDistances = weeks.map((week: any) => (week.total_distance || 0) / 1000);
  const weeklyRunCounts = weeks.map((week: any) => week.plan_scheduled_runs?.length || 0);
  
  const avgWeeklyDistance = weeklyDistances.reduce((sum, dist) => sum + dist, 0) / weeks.length;
  const avgWeeklyRuns = weeklyRunCounts.reduce((sum, count) => sum + count, 0) / weeks.length;

  // Run type distribution
  const runTypes = allRuns.reduce((acc: any, run: any) => {
    const type = run.run_type?.toLowerCase() || 'easy';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const runTypeDistribution = {
    easy: runTypes.easy || 0,
    tempo: runTypes.tempo || 0,
    interval: runTypes.interval || 0,
    long: runTypes.long || 0
  };

  // Easy vs hard runs
  const easyRuns = (runTypes.easy || 0) + (runTypes.recovery || 0);
  const hardRuns = (runTypes.tempo || 0) + (runTypes.interval || 0) + (runTypes.threshold || 0);

  // Progression analysis
  const peakWeekIndex = weeklyDistances.indexOf(Math.max(...weeklyDistances));
  const peakDistance = Math.max(...weeklyDistances);
  
  // Calculate buildup rate (average increase per week in first half)
  const firstHalf = weeklyDistances.slice(0, Math.floor(weeks.length / 2));
  const buildupRate = firstHalf.length > 1 ? 
    (firstHalf[firstHalf.length - 1] - firstHalf[0]) / (firstHalf.length - 1) : 0;

  // Count taper weeks (weeks after peak with decreasing distance)
  let taperWeeks = 0;
  for (let i = peakWeekIndex + 1; i < weeklyDistances.length; i++) {
    if (weeklyDistances[i] < weeklyDistances[i - 1]) {
      taperWeeks++;
    } else {
      break;
    }
  }

  const analysis: any = {
    totalDistance,
    totalRuns,
    weeklyAverages: {
      distance: avgWeeklyDistance,
      runs: avgWeeklyRuns,
      easyRuns: easyRuns / weeks.length,
      hardRuns: hardRuns / weeks.length
    },
    runTypeDistribution,
    progressionAnalysis: {
      peakWeek: peakWeekIndex + 1,
      peakDistance,
      buildupRate,
      taperWeeks
    }
  };

  // Add completion statistics if requested
  if (includeCompletion) {
    const completedRuns = allRuns.filter((run: any) => run.completed);
    const completedDistance = completedRuns.reduce((sum: number, run: any) => 
      sum + (run.actual_distance || run.distance || 0), 0) / 1000;

    // Calculate current streak
    const today = new Date();
    const sortedRuns = allRuns
      .filter((run: any) => new Date(run.date) <= today)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streakDays = 0;
    for (const run of sortedRuns) {
      if (run.completed) {
        streakDays++;
      } else {
        break;
      }
    }

    analysis.completionStats = {
      totalCompleted: completedRuns.length,
      completionRate: totalRuns > 0 ? (completedRuns.length / totalRuns) * 100 : 0,
      avgCompletedDistance: completedRuns.length > 0 ? completedDistance / completedRuns.length : 0,
      streakDays
    };
  }

  return analysis;
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for analysis or POST for comparison.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for analysis or POST for comparison.' },
    { status: 405 }
  );
}
