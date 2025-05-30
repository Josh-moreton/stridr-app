import { supabase } from "./supabase";


interface PlanData {
  plan: {
    id: string;
    name: string;
    description: string;
    units: string;
    type: string;
  };
  paces: {
    easy: { min: number; sec: number };
    marathon: { min: number; sec: number };
    threshold: { min: number; sec: number };
    interval: { min: number; sec: number };
    recovery: { min: number; sec: number };
    long: { min: number; sec: number };
  };
  units: string;
  raceDistance: string;
  goalTime: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}

export interface TrainingWorkout {
  id?: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string | null; // Updated to allow null
  workout_type: string;
  distance?: number;
  pace?: string;
  color: string;
  all_day: boolean;
}

// Format a pace object to string
const formatPace = (pace: { min: number; sec: number }): string => {
  return `${pace.min}:${String(pace.sec).padStart(2, '0')}`;
};

/**
 * Save training plan to Supabase
 */
export const saveTrainingPlan = async (planData: PlanData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Save the training plan
    const { data: planResult, error: planError } = await supabase
      .from('training_plans')
      .insert({
        user_id: user.id,
        plan_id: planData.plan.id,
        plan_name: planData.plan.name,
        race_distance: planData.raceDistance,
        units: planData.units,
        goal_time: `${planData.goalTime.hours}:${planData.goalTime.minutes}:${planData.goalTime.seconds}`
      })
      .select();
    
    if (planError || !planResult) {
      throw planError || new Error('Failed to save training plan');
    }

    const trainingPlanId = planResult[0].id;
    
    // Save pace calculations
    const { error: paceError } = await supabase
      .from('pace_calculations')
      .insert({
        plan_id: trainingPlanId,
        easy_pace: formatPace(planData.paces.easy),
        marathon_pace: formatPace(planData.paces.marathon),
        threshold_pace: formatPace(planData.paces.threshold),
        interval_pace: formatPace(planData.paces.interval),
        recovery_pace: formatPace(planData.paces.recovery),
        long_pace: formatPace(planData.paces.long)
      });
    
    if (paceError) {
      throw paceError;
    }
    
    return { trainingPlanId };
  } catch (error) {
    console.error('Error saving training plan:', error);
    throw error;
  }
};

/**
 * Get user's training plans
 */
export const getUserTrainingPlans = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data, error } = await supabase
      .from('training_plans')
      .select('*, pace_calculations(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching training plans:', error);
    throw error;
  }
};

/**
 * Get all user's workout events
 */
export const getWorkoutEvents = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data, error } = await supabase
      .from('workout_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });
    
    if (error) {
      // If table doesn't exist or other DB error, return empty array instead of throwing
      console.warn('Error fetching workout events:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching workout events:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
};

/**
 * Save workout events to calendar
 */
export const saveWorkoutEvents = async (workouts: TrainingWorkout[]) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Prepare workout events with user ID
    const workoutsWithUserId = workouts.map(workout => ({
      ...workout,
      user_id: user.id
    }));
    
    const { data, error } = await supabase
      .from('workout_events')
      .insert(workoutsWithUserId)
      .select();
    
    if (error) {
      console.error('Error saving workout events:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving workout events:', error);
    throw error;
  }
};

/**
 * Save a single workout event to calendar
 */
export const saveWorkoutEvent = async (workout: Omit<TrainingWorkout, 'id'>) => {
  try {
    console.log("Starting saveWorkoutEvent with:", workout); // Debug log
    
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user); // Debug log
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Prepare workout event with user ID
    const workoutWithUserId = {
      ...workout,
      user_id: user.id
    };
    
    console.log("Workout with user ID:", workoutWithUserId); // Debug log
    
    const { data, error } = await supabase
      .from('workout_events')
      .insert([workoutWithUserId])
      .select()
      .single();
    
    console.log("Supabase response - data:", data, "error:", error); // Debug log
    
    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
    }
    
    if (!data) {
      throw new Error('No data returned from database');
    }
    
    return data;
  } catch (error) {
    console.error('Error in saveWorkoutEvent:', error);
    throw error;
  }
};

/**
 * Update a workout event
 */
export const updateWorkoutEvent = async (id: string, workout: Partial<Omit<TrainingWorkout, 'id' | 'user_id'>>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data, error } = await supabase
      .from('workout_events')
      .update(workout)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating workout event:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating workout event:', error);
    throw error;
  }
};

/**
 * Delete a workout event
 */
export const deleteWorkoutEvent = async (id: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { error } = await supabase
      .from('workout_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting workout event:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting workout event:', error);
    throw error;
  }
};
