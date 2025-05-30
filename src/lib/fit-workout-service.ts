import { supabase } from './supabase';

export interface FitWorkoutFile {
  id?: string;
  user_id?: string;
  
  // File ID fields
  file_type: string;
  manufacturer: string;
  product: string;
  serial_number?: number;
  time_created: Date;
  
  // Workout fields
  workout_name: string;
  sport: string;
  capabilities?: number;
  num_valid_steps: number;
  
  // Steps
  steps: FitWorkoutStep[];
}

export interface FitWorkoutStep {
  id?: string;
  workout_file_id?: string;
  user_id?: string;
  
  step_index: number;
  step_name?: string;
  message_index?: number;
  
  // Duration
  duration_type: 'time' | 'distance' | 'calories' | 'open' | 'repeat_until_steps_cmplt';
  duration_value?: number;
  duration_time?: string; // ISO duration string
  duration_distance?: number; // meters
  
  // Target
  target_type: 'speed' | 'heart_rate' | 'power' | 'cadence' | 'open' | 'pace';
  target_value?: number;
  target_low?: number;
  target_high?: number;
  custom_target_value_low?: number;
  custom_target_value_high?: number;
  
  // Intensity
  intensity: 'active' | 'rest' | 'warmup' | 'cooldown';
  
  // Repeat
  repeat_steps?: number;
  repeat_type?: string;
  repeat_value?: number;
  
  notes?: string;
}

/**
 * Save a structured workout that can be exported as FIT
 */
export const saveStructuredWorkout = async (workout: FitWorkoutFile): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Insert workout file
    const { data: workoutFile, error: workoutError } = await supabase
      .from('workout_files')
      .insert([{
        ...workout,
        user_id: user.id,
        num_valid_steps: workout.steps.length
      }])
      .select()
      .single();
    
    if (workoutError) throw workoutError;
    
    // Insert workout steps
    const stepsWithIds = workout.steps.map((step, index) => ({
      ...step,
      workout_file_id: workoutFile.id,
      user_id: user.id,
      step_index: index
    }));
    
    const { error: stepsError } = await supabase
      .from('workout_steps')
      .insert(stepsWithIds);
    
    if (stepsError) throw stepsError;
    
    return workoutFile.id;
  } catch (error) {
    console.error('Error saving structured workout:', error);
    throw error;
  }
};

/**
 * Get structured workout with steps
 */
export const getStructuredWorkout = async (workoutId: string): Promise<FitWorkoutFile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Get workout file
    const { data: workoutFile, error: workoutError } = await supabase
      .from('workout_files')
      .select('*')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .single();
    
    if (workoutError) throw workoutError;
    
    // Get workout steps
    const { data: steps, error: stepsError } = await supabase
      .from('workout_steps')
      .select('*')
      .eq('workout_file_id', workoutId)
      .eq('user_id', user.id)
      .order('step_index', { ascending: true });
    
    if (stepsError) throw stepsError;
    
    return {
      ...workoutFile,
      steps: steps || []
    };
  } catch (error) {
    console.error('Error getting structured workout:', error);
    throw error;
  }
};

/**
 * Get all user's structured workouts
 */
export const getUserStructuredWorkouts = async (): Promise<FitWorkoutFile[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data: workoutFiles, error } = await supabase
      .from('workout_files')
      .select(`
        *,
        workout_steps (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return workoutFiles?.map(file => ({
      ...file,
      steps: file.workout_steps || []
    })) || [];
  } catch (error) {
    console.error('Error getting user structured workouts:', error);
    return [];
  }
};

/**
 * Convert simple calendar event to structured workout
 */
export const convertCalendarEventToStructuredWorkout = (event: any): FitWorkoutFile => {
  // Create a simple single-step workout from calendar event
  const step: FitWorkoutStep = {
    step_index: 0,
    step_name: event.title,
    duration_type: 'open', // Open duration (user decides when to stop)
    target_type: event.pace ? 'pace' : 'open',
    intensity: event.workout_type?.toLowerCase() === 'recovery' ? 'rest' : 'active',
    notes: event.description
  };
  
  // If we have pace info, set target
  if (event.pace) {
    // Convert pace string (e.g., "8:30") to speed in m/s for FIT file
    const [minutes, seconds] = event.pace.split(':').map(Number);
    const pacePerMile = minutes * 60 + seconds; // seconds per mile
    const speedMps = 1609.34 / pacePerMile; // meters per second
    
    step.target_value = speedMps;
    step.target_type = 'speed';
  }
  
  return {
    file_type: 'workout',
    manufacturer: 'stridr',
    product: 'stridr-app',
    time_created: new Date(),
    workout_name: event.title,
    sport: 'running',
    num_valid_steps: 1,
    steps: [step]
  };
};

/**
 * Export structured workout as FIT file data
 * (This would integrate with a FIT file library)
 */
export const exportWorkoutAsFitData = async (workoutId: string) => {
  const workout = await getStructuredWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  
  // Here you would use a FIT file library to generate the binary data
  // For now, return the structured data that can be converted
  return {
    fileType: 'workout',
    messages: {
      fileId: {
        type: workout.file_type,
        manufacturer: workout.manufacturer,
        product: workout.product,
        timeCreated: workout.time_created
      },
      workout: {
        workoutName: workout.workout_name,
        sport: workout.sport,
        numValidSteps: workout.num_valid_steps
      },
      workoutSteps: workout.steps.map(step => ({
        messageIndex: step.step_index,
        stepName: step.step_name,
        durationType: step.duration_type,
        durationValue: step.duration_value,
        targetType: step.target_type,
        targetValue: step.target_value,
        targetValueLow: step.target_low,
        targetValueHigh: step.target_high,
        intensity: step.intensity,
        notes: step.notes
      }))
    }
  };
};