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
      .order('run_date', { ascending: true }); // Fixed: use run_date not scheduled_date
      
    if (startDate) {
      query = query.gte('run_date', startDate); // Fixed: use run_date
    }
    
    if (endDate) {
      query = query.lte('run_date', endDate); // Fixed: use run_date
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
    console.log('📅 Received event data:', JSON.stringify(eventData, null, 2));
    
    if (!eventData) {
      return NextResponse.json({ error: 'Missing event data' }, { status: 400 });
    }
    
    // Map frontend data to correct database schema
    const mappedEventData = {
      user_id: user.id,
      run_date: eventData.date || eventData.scheduled_date || eventData.run_date || new Date().toISOString().split('T')[0], // Fixed: use run_date
      run_type: eventData.runType || eventData.run_type || 'Easy',
      description: eventData.description || eventData.title || 'Workout',
      total_duration_seconds: eventData.duration || eventData.total_duration_seconds || null,
      total_distance_meters: eventData.distance || eventData.total_distance_meters || null,
      day_of_week: eventData.day_of_week || new Date(eventData.date || new Date()).getDay(),
      workout_steps: eventData.workout_steps || null,
      notes: eventData.notes || null,
      is_completed: eventData.completed || eventData.is_completed || false, // Fixed: use is_completed
      // Required fields - set defaults for manually created events
      weekly_schedule_id: eventData.weekly_schedule_id || null, // Allow null for manual events
      training_plan_id: eventData.training_plan_id || null, // Allow null for manual events
    };

    console.log('📅 Mapped event data for DB:', JSON.stringify(mappedEventData, null, 2));
    
    const { data: event, error: insertError } = await supabase
      .from('plan_scheduled_runs')
      .insert(mappedEventData)
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error creating event:', insertError);
      console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to create event', 
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code 
      }, { status: 500 });
    }
    
    console.log('✅ Successfully created event:', event);
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('❌ Error in calendar API POST:', error);
    console.error('❌ Error stack:', error.stack);
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

    // Map update fields to correct schema
    const mappedUpdates: any = {};
    
    if (updates.date || updates.scheduled_date || updates.run_date) {
      mappedUpdates.run_date = updates.date || updates.scheduled_date || updates.run_date;
    }
    if (updates.runType || updates.run_type) {
      mappedUpdates.run_type = updates.runType || updates.run_type;
    }
    if (updates.description !== undefined) {
      mappedUpdates.description = updates.description;
    }
    if (updates.duration || updates.total_duration_seconds) {
      mappedUpdates.total_duration_seconds = updates.duration || updates.total_duration_seconds;
    }
    if (updates.distance || updates.total_distance_meters) {
      mappedUpdates.total_distance_meters = updates.distance || updates.total_distance_meters;
    }
    if (updates.completed !== undefined || updates.is_completed !== undefined) {
      mappedUpdates.is_completed = updates.completed !== undefined ? updates.completed : updates.is_completed;
    }
    if (updates.notes !== undefined) {
      mappedUpdates.notes = updates.notes;
    }
    if (updates.workout_steps !== undefined) {
      mappedUpdates.workout_steps = updates.workout_steps;
    }
    
    const { data: event, error: updateError } = await supabase
      .from('plan_scheduled_runs')
      .update(mappedUpdates)
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
