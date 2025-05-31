import { NextRequest, NextResponse } from 'next/server';
import { createAPIClient } from '@/lib/supabase-server';
import { ScheduledRun } from '@/lib/planGenerator';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  type: 'run' | 'rest' | 'cross-training';
  runType?: string;
  distance?: number;
  duration?: number;
  completed?: boolean;
  backgroundColor?: string;
  borderColor?: string;
}

interface CalendarRequest {
  startDate: string;
  endDate: string;
  planId?: string;
}

interface CalendarResponse {
  success: boolean;
  events?: CalendarEvent[];
  error?: string;
}

interface UpdateRunRequest {
  runId: string;
  completed: boolean;
  actualDistance?: number;
  actualDuration?: number;
  notes?: string;
}

// GET /api/calendar - Get calendar events for date range
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const planId = searchParams.get('planId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('plan_scheduled_runs')
      .select(`
        *,
        plan_weekly_schedules!inner (
          plan_id,
          user_training_plans!inner (
            user_id,
            plan_name
          )
        )
      `)
      .eq('plan_weekly_schedules.user_training_plans.user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (planId) {
      query = query.eq('plan_weekly_schedules.plan_id', planId);
    }

    const { data: runsData, error: runsError } = await query;

    if (runsError) {
      console.error('Error fetching calendar events:', runsError);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    // Convert runs to calendar events
    const events: CalendarEvent[] = runsData.map(run => {
      const runDate = new Date(run.date);
      const eventColor = getEventColor(run.run_type, run.completed);
      
      // Estimate duration if not provided
      let estimatedDuration = run.duration;
      if (!estimatedDuration && run.distance) {
        // Rough estimate: 6 min/km for easy runs, 4 min/km for hard runs
        const paceMinPerKm = run.run_type === 'Easy' ? 6 : run.run_type === 'Long' ? 6.5 : 4.5;
        estimatedDuration = (run.distance / 1000) * paceMinPerKm * 60; // Convert to seconds
      }

      const startTime = new Date(runDate);
      startTime.setHours(7, 0, 0, 0); // Default start time 7:00 AM
      
      const endTime = new Date(startTime);
      if (estimatedDuration) {
        endTime.setSeconds(endTime.getSeconds() + estimatedDuration);
      } else {
        endTime.setHours(endTime.getHours() + 1); // Default 1 hour
      }

      return {
        id: run.id,
        title: `${run.run_type}${run.distance ? ` - ${(run.distance / 1000).toFixed(1)}km` : ''}`,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        description: run.description,
        type: 'run' as const,
        runType: run.run_type,
        distance: run.distance,
        duration: run.duration,
        completed: run.completed,
        backgroundColor: eventColor.background,
        borderColor: eventColor.border
      };
    });

    return NextResponse.json<CalendarResponse>({
      success: true,
      events
    });

  } catch (error) {
    console.error('Error in GET /api/calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/calendar - Add custom event or update run status
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

    const body = await request.json();
    const action = body.action;

    if (action === 'updateRun') {
      const { runId, completed, actualDistance, actualDuration, notes }: UpdateRunRequest = body;

      if (!runId) {
        return NextResponse.json(
          { error: 'Run ID is required' },
          { status: 400 }
        );
      }

      // Update run status
      const { error: updateError } = await supabase
        .from('plan_scheduled_runs')
        .update({
          completed,
          actual_distance: actualDistance,
          actual_duration: actualDuration,
          notes,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', runId);

      if (updateError) {
        console.error('Error updating run:', updateError);
        return NextResponse.json(
          { error: 'Failed to update run' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Run updated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in POST /api/calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/calendar - Update calendar event
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { eventId, newDate, updates } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Update the scheduled run
    const updateData: any = {};
    if (newDate) updateData.date = newDate;
    if (updates?.distance) updateData.distance = updates.distance;
    if (updates?.duration) updateData.duration = updates.duration;
    if (updates?.description) updateData.description = updates.description;

    const { error: updateError } = await supabase
      .from('plan_scheduled_runs')
      .update(updateData)
      .eq('id', eventId);

    if (updateError) {
      console.error('Error updating calendar event:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function getEventColor(runType: string, completed: boolean) {
  const baseColors = {
    'Easy': { background: '#10B981', border: '#059669' },    // Green
    'Tempo': { background: '#F59E0B', border: '#D97706' },   // Orange
    'Interval': { background: '#EF4444', border: '#DC2626' }, // Red
    'Long': { background: '#8B5CF6', border: '#7C3AED' },    // Purple
    'Rest': { background: '#6B7280', border: '#4B5563' }     // Gray
  };

  const color = baseColors[runType as keyof typeof baseColors] || baseColors['Easy'];
  
  if (completed) {
    return {
      background: color.background,
      border: color.border
    };
  } else {
    // Lighter colors for incomplete runs
    return {
      background: color.background + '80', // Add transparency
      border: color.border + '80'
    };
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to update run status.' },
    { status: 405 }
  );
}
