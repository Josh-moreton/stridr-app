import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper function to create authenticated Supabase client
async function createAuthenticatedClient() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return { supabase, user };
}

// GET /api/training-plan/crud - Get user's training plans
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (planId) {
      // Get specific plan with all related data
      const { data: planData, error: planError } = await supabase
        .from('user_training_plans')
        .select(`
          *,
          plan_weekly_schedules (
            *,
            plan_scheduled_runs (*)
          )
        `)
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();

      if (planError) {
        return NextResponse.json(
          { error: 'Failed to fetch training plan', details: planError.message },
          { status: 500 }
        );
      }

      if (!planData) {
        return NextResponse.json(
          { error: 'Training plan not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, plan: planData });
    } else {
      // Get all user's plans
      const { data: plansData, error: plansError } = await supabase
        .from('user_training_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (plansError) {
        return NextResponse.json(
          { error: 'Failed to fetch training plans', details: plansError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, plans: plansData || [] });
    }
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    console.error('Error in GET /api/training-plan/crud:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/training-plan/crud - Delete a training plan
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Delete the training plan (cascade should handle related data)
    const { error: deleteError } = await supabase
      .from('user_training_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete training plan', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Training plan deleted successfully' });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    console.error('Error in DELETE /api/training-plan/crud:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/training-plan/crud - Update a training plan
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { updates } = body;

    if (!updates) {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Update the training plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('user_training_plans')
      .update(updates)
      .eq('id', planId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update training plan', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedPlan) {
      return NextResponse.json(
        { error: 'Training plan not found or not authorized to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    console.error('Error in PUT /api/training-plan/crud:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
