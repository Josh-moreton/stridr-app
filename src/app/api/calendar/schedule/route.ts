import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Create authenticated Supabase client (matches your other APIs)
async function createAPIClient(request: NextRequest) {
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAPIClient(request);

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let query = supabase
      .from('plan_scheduled_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true });
      
    if (startDate) {
      query = query.gte('scheduled_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('scheduled_date', endDate);
    }
    
    const { data: events, error: eventsError } = await query;
      
    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch events', details: eventsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, events: events || [] });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error in calendar API GET:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAPIClient(request);

    const eventData = await request.json();
    
    if (!eventData) {
      return NextResponse.json({ error: 'Missing event data' }, { status: 400 });
    }
    
    if (!eventData.scheduled_date) {
      eventData.scheduled_date = new Date().toISOString().split('T')[0];
    }
    
    const eventWithUserId = {
      ...eventData,
      user_id: user.id,
    };
    
    const { data: event, error: insertError } = await supabase
      .from('plan_scheduled_runs')
      .insert(eventWithUserId)
      .select()
      .single();
      
    if (insertError) {
      console.error('Error creating event:', insertError);
      return NextResponse.json({ error: 'Failed to create event', details: insertError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error in calendar API POST:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await createAPIClient(request);

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }
    
    const updates = await request.json();
    
    if (!updates) {
      return NextResponse.json({ error: 'Missing update data' }, { status: 400 });
    }
    
    const { data: event, error: updateError } = await supabase
      .from('plan_scheduled_runs')
      .update(updates)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating event:', updateError);
      return NextResponse.json({ error: 'Failed to update event', details: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error in calendar API PUT:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await createAPIClient(request);

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }
    
    const { error: deleteError } = await supabase
      .from('plan_scheduled_runs')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);
      
    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event', details: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error in calendar API DELETE:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// import { NextRequest, NextResponse } from 'next/server';
// import { createAPIClient } from '@/lib/supabase-server';
// import { TrainingPlan, WeeklySchedule, ScheduledRun } from '@/lib/planGenerator';

// interface ScheduleToCalendarRequest {
//   planId: string;
//   options?: {
//     overwrite?: boolean; // Whether to overwrite existing calendar entries
//     startTime?: string; // Default start time for workouts (HH:MM format)
//     preferredDays?: string[]; // Preferred days for certain workout types
//   };
// }

// interface CalendarEntry {
//   plan_id: string;
//   week_number: number;
//   date: string;
//   day_of_week: number;
//   run_type: string;
//   description: string;
//   total_duration?: number;
//   total_distance?: number;
//   steps?: any;
//   notes?: string;
//   scheduled_time?: string;
// }

// // POST /api/calendar/schedule - Schedule a training plan to calendar
// export async function POST(request: NextRequest) {
//   try {
//     const { supabase } = createAPIClient(request);
    
//     // Verify authentication
//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json(
//         { error: 'Unauthorized: User not authenticated' },
//         { status: 401 }
//       );
//     }

//     const body: ScheduleToCalendarRequest = await request.json();
//     const { planId, options = {} } = body;

//     if (!planId) {
//       return NextResponse.json(
//         { error: 'Plan ID is required' },
//         { status: 400 }
//       );
//     }

//     // Fetch the training plan
//     const { data: planData, error: planError } = await supabase
//       .from('user_training_plans')
//       .select(`
//         *,
//         plan_weekly_schedules (
//           *,
//           plan_scheduled_runs (*)
//         )
//       `)
//       .eq('id', planId)
//       .eq('user_id', user.id)
//       .single();

//     if (planError || !planData) {
//       return NextResponse.json(
//         { error: 'Training plan not found or access denied' },
//         { status: 404 }
//       );
//     }

//     // Check if calendar entries already exist
//     const { data: existingEntries } = await supabase
//       .from('plan_scheduled_runs')
//       .select('id, date')
//       .in('weekly_schedule_id', planData.plan_weekly_schedules.map((ws: any) => ws.id));

//     if (existingEntries && existingEntries.length > 0 && !options.overwrite) {
//       return NextResponse.json(
//         { 
//           error: 'Calendar entries already exist for this plan. Use overwrite option to replace them.',
//           existingCount: existingEntries.length 
//         },
//         { status: 409 }
//       );
//     }

//     // If overwriting, delete existing entries
//     if (options.overwrite && existingEntries && existingEntries.length > 0) {
//       const { error: deleteError } = await supabase
//         .from('plan_scheduled_runs')
//         .delete()
//         .in('weekly_schedule_id', planData.plan_weekly_schedules.map((ws: any) => ws.id));

//       if (deleteError) {
//         console.error('Error deleting existing calendar entries:', deleteError);
//         return NextResponse.json(
//           { error: 'Failed to clear existing calendar entries' },
//           { status: 500 }
//         );
//       }
//     }

//     // Process each weekly schedule and create calendar entries
//     const calendarEntries: CalendarEntry[] = [];
//     let totalScheduled = 0;

//     for (const weeklySchedule of planData.plan_weekly_schedules) {
//       // If runs already exist in this weekly schedule, use them
//       if (weeklySchedule.plan_scheduled_runs && weeklySchedule.plan_scheduled_runs.length > 0) {
//         totalScheduled += weeklySchedule.plan_scheduled_runs.length;
//         continue;
//       }

//       // Otherwise, create calendar entries based on the weekly schedule
//       // This would typically be done during plan generation, but we're handling it here for manual scheduling
//       const weekStartDate = new Date(weeklySchedule.start_date);
      
//       // Create sample runs for each day of the week (this would normally come from the plan generator)
//       for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
//         const runDate = new Date(weekStartDate);
//         runDate.setDate(runDate.getDate() + dayOffset);
        
//         // Skip if it's a rest day (example logic)
//         if (dayOffset === 1 || dayOffset === 5) { // Tuesday and Saturday rest days
//           continue;
//         }

//         const runType = getRunTypeForDay(dayOffset, weeklySchedule.week_number);
//         const defaultTime = options.startTime || '07:00';
        
//         const calendarEntry: CalendarEntry = {
//           plan_id: planId,
//           week_number: weeklySchedule.week_number,
//           date: runDate.toISOString().split('T')[0],
//           day_of_week: runDate.getDay(),
//           run_type: runType,
//           description: `${runType} Run - Week ${weeklySchedule.week_number}`,
//           scheduled_time: defaultTime,
//           notes: weeklySchedule.summary || 'Training run as per plan'
//         };

//         calendarEntries.push(calendarEntry);
//       }
//     }

//     // Insert new calendar entries if we created any
//     if (calendarEntries.length > 0) {
//       // First, we need to insert them into plan_scheduled_runs with proper weekly_schedule_id
//       const runsToInsert = calendarEntries.map(entry => {
//         const weeklySchedule = planData.plan_weekly_schedules.find((ws: any) => ws.week_number === entry.week_number);
//         return {
//           weekly_schedule_id: weeklySchedule.id,
//           date: entry.date,
//           day_of_week: entry.day_of_week,
//           run_type: entry.run_type,
//           description: entry.description,
//           total_duration: entry.total_duration,
//           total_distance: entry.total_distance,
//           steps: entry.steps,
//           notes: entry.notes,
//           completed: false,
//           created_at: new Date().toISOString()
//         };
//       });

//       const { data: insertedRuns, error: insertError } = await supabase
//         .from('plan_scheduled_runs')
//         .insert(runsToInsert)
//         .select();

//       if (insertError) {
//         console.error('Error inserting calendar entries:', insertError);
//         return NextResponse.json(
//           { error: 'Failed to create calendar entries' },
//           { status: 500 }
//         );
//       }

//       totalScheduled += insertedRuns.length;
//     }

//     // Update plan to mark it as scheduled to calendar
//     const { error: updateError } = await supabase
//       .from('user_training_plans')
//       .update({ 
//         scheduled_to_calendar: true,
//         calendar_scheduled_at: new Date().toISOString()
//       })
//       .eq('id', planId);

//     if (updateError) {
//       console.warn('Could not update plan scheduling status:', updateError);
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Training plan successfully scheduled to calendar',
//       planId,
//       totalRunsScheduled: totalScheduled,
//       calendarEntriesCreated: calendarEntries.length,
//       options: options
//     });

  } catch (error) {
    console.error('Error in POST /api/calendar/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to determine run type based on day and week
function getRunTypeForDay(dayOffset: number, weekNumber: number): string {
  // Simple logic for run type assignment
  // This would normally be more sophisticated and come from the plan generator
  
  switch (dayOffset) {
    case 0: // Sunday - Long run
      return 'Long';
    case 2: // Tuesday - Speed work
      return weekNumber % 2 === 0 ? 'Interval' : 'Tempo';
    case 3: // Wednesday - Easy run
      return 'Easy';
    case 4: // Thursday - Tempo or Easy
      return weekNumber % 3 === 0 ? 'Tempo' : 'Easy';
    case 6: // Saturday - Easy run
      return 'Easy';
    default:
      return 'Easy';
  }
}

// GET /api/calendar/schedule - Get scheduling status for a plan
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

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Check scheduling status
    const { data: planData, error: planError } = await supabase
      .from('user_training_plans')
      .select(`
        id,
        plan_name,
        scheduled_to_calendar,
        calendar_scheduled_at,
        plan_weekly_schedules (
          id,
          week_number,
          plan_scheduled_runs (id, date, run_type, completed)
        )
      `)
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError || !planData) {
      return NextResponse.json(
        { error: 'Training plan not found or access denied' },
        { status: 404 }
      );
    }

    // Count scheduled runs
    const totalRuns = planData.plan_weekly_schedules.reduce(
      (total: number, week: any) => total + (week.plan_scheduled_runs?.length || 0), 
      0
    );

    const completedRuns = planData.plan_weekly_schedules.reduce(
      (total: number, week: any) => 
        total + (week.plan_scheduled_runs?.filter((run: any) => run.completed)?.length || 0), 
      0
    );

    return NextResponse.json({
      success: true,
      planId,
      planName: planData.plan_name,
      isScheduled: planData.scheduled_to_calendar || false,
      scheduledAt: planData.calendar_scheduled_at,
      totalRuns,
      completedRuns,
      completionRate: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0,
      weeklyBreakdown: planData.plan_weekly_schedules.map((week: any) => ({
        weekNumber: week.week_number,
        totalRuns: week.plan_scheduled_runs?.length || 0,
        completedRuns: week.plan_scheduled_runs?.filter((run: any) => run.completed)?.length || 0
      }))
    });

  } catch (error) {
    console.error('Error in GET /api/calendar/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/schedule - Remove plan from calendar
export async function DELETE(request: NextRequest) {
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

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Verify plan ownership
    const { data: planData, error: planError } = await supabase
      .from('user_training_plans')
      .select('id, plan_weekly_schedules(id)')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError || !planData) {
      return NextResponse.json(
        { error: 'Training plan not found or access denied' },
        { status: 404 }
      );
    }

    // Delete all scheduled runs for this plan
    const weeklyScheduleIds = planData.plan_weekly_schedules.map((ws: any) => ws.id);
    
    const { error: deleteError } = await supabase
      .from('plan_scheduled_runs')
      .delete()
      .in('weekly_schedule_id', weeklyScheduleIds);

    if (deleteError) {
      console.error('Error deleting calendar entries:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove calendar entries' },
        { status: 500 }
      );
    }

    // Update plan to mark it as not scheduled
    const { error: updateError } = await supabase
      .from('user_training_plans')
      .update({ 
        scheduled_to_calendar: false,
        calendar_scheduled_at: null
      })
      .eq('id', planId);

    if (updateError) {
      console.warn('Could not update plan scheduling status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Training plan removed from calendar successfully',
      planId
    });

  } catch (error) {
    console.error('Error in DELETE /api/calendar/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
