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

// Predefined workout step templates
export const WORKOUT_STEP_TYPES = {
  WARMUP: {
    intensity: 'warmup' as const,
    target_type: 'open' as const,
    duration_type: 'time' as const,
    step_name: 'Warm Up'
  },
  EASY_RUN: {
    intensity: 'active' as const,
    target_type: 'pace' as const,
    duration_type: 'distance' as const,
    step_name: 'Easy Run'
  },
  TEMPO_RUN: {
    intensity: 'active' as const,
    target_type: 'pace' as const,
    duration_type: 'distance' as const,
    step_name: 'Tempo Run'
  },
  INTERVAL: {
    intensity: 'active' as const,
    target_type: 'pace' as const,
    duration_type: 'distance' as const,
    step_name: 'Interval'
  },
  RECOVERY: {
    intensity: 'rest' as const,
    target_type: 'open' as const,
    duration_type: 'time' as const,
    step_name: 'Recovery'
  },
  COOLDOWN: {
    intensity: 'cooldown' as const,
    target_type: 'open' as const,
    duration_type: 'time' as const,
    step_name: 'Cool Down'
  }
};

/**
 * Save a structured workout that can be exported as FIT
 */
export const saveStructuredWorkout = async (workout: FitWorkoutFile): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Prepare data for the 'workout_files' table, excluding the 'steps' array
    // and ensuring 'time_created' is in the correct format.
    const { steps, id, user_id, ...workoutDataForTable } = workout; // Destructure to remove steps, id, and user_id from the spread

    // Insert workout file
    const { data: workoutFile, error: workoutError } = await supabase
      .from('workout_files')
      .insert([{
        ...workoutDataForTable, // Spread only the metadata
        time_created: workout.time_created.toISOString(), // Convert Date to ISO string
        user_id: user.id,
        num_valid_steps: workout.steps.length // Correctly calculate num_valid_steps
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
 * Create a default structured workout template
 */
export const createDefaultStructuredWorkout = (): FitWorkoutFile => {
  return {
    file_type: 'workout',
    manufacturer: 'stridr',
    product: 'stridr-app',
    time_created: new Date(),
    workout_name: '',
    sport: 'running',
    num_valid_steps: 3,
    steps: [
      {
        step_index: 0,
        ...WORKOUT_STEP_TYPES.WARMUP,
        duration_value: 600, // 10 minutes
      },
      {
        step_index: 1,
        ...WORKOUT_STEP_TYPES.EASY_RUN,
        duration_distance: 5000, // 5km
        target_value: 5.0, // m/s (roughly 8:00/mile pace)
      },
      {
        step_index: 2,
        ...WORKOUT_STEP_TYPES.COOLDOWN,
        duration_value: 300, // 5 minutes
      }
    ]
  };
};

/**
 * Helper function to convert pace string to m/s
 */
export const paceToMps = (paceString: string): number => {
  const [minutes, seconds] = paceString.split(':').map(Number);
  const pacePerMile = minutes * 60 + seconds; // seconds per mile
  return 1609.34 / pacePerMile; // meters per second
};

/**
 * Helper function to convert m/s to pace string
 */
export const mpsToPace = (mps: number): string => {
  const pacePerMile = 1609.34 / mps; // seconds per mile
  const minutes = Math.floor(pacePerMile / 60);
  const seconds = Math.round(pacePerMile % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Helper function to format duration
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

/**
 * Helper function to format distance
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters}m`;
  } else {
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  }
};

/**
 * Export structured workout as FIT file download
 */
export const exportWorkoutAsFit = async (workoutId: string): Promise<void> => {
  try {
    const workout = await getStructuredWorkout(workoutId);
    if (!workout) {
      throw new Error('Workout not found');
    }

    // Create FIT file content (simplified binary format simulation)
    const fitContent = createFitFileContent(workout);
    
    // Create blob and download
    const blob = new Blob([fitContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workout.workout_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.fit`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting FIT file:', error);
    throw error;
  }
};

/**
 * Create FIT file content (simplified implementation)
 * In a real implementation, you would use the FIT SDK or similar library
 */
const createFitFileContent = (workout: FitWorkoutFile): ArrayBuffer => {
  // This is a simplified implementation for demonstration
  // In production, you would use the official Garmin FIT SDK
  
  const encoder = new TextEncoder();
  const header = `FIT Workout: ${workout.workout_name}\n`;
  const steps = workout.steps.map(step => {
    let stepInfo = `Step ${step.step_index + 1}: ${step.step_name || 'Unnamed'}\n`;
    stepInfo += `  Intensity: ${step.intensity}\n`;
    
    if (step.duration_type === 'time' && step.duration_value) {
      stepInfo += `  Duration: ${formatDuration(step.duration_value)}\n`;
    } else if (step.duration_type === 'distance' && step.duration_distance) {
      stepInfo += `  Distance: ${formatDistance(step.duration_distance)}\n`;
    }
    
    if (step.target_type === 'pace' && step.target_value) {
      stepInfo += `  Target Pace: ${mpsToPace(step.target_value)}/mile\n`;
    }
    
    return stepInfo;
  }).join('\n');
  
  const content = header + '\n' + steps;
  const encoded = encoder.encode(content);
  
  // Convert to ArrayBuffer
  const buffer = new ArrayBuffer(encoded.length);
  const view = new Uint8Array(buffer);
  view.set(encoded);
  
  return buffer;
};

/**
 * Validate workout structure
 */
export const validateWorkout = (workout: FitWorkoutFile): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic validation
  if (!workout.workout_name?.trim()) {
    errors.push('Workout name is required');
  }
  
  if (!workout.steps || workout.steps.length === 0) {
    errors.push('Workout must have at least one step');
  }
  
  if (workout.steps) {
    // Validate step sequence
    const hasWarmup = workout.steps.some(step => step.intensity === 'warmup');
    const hasCooldown = workout.steps.some(step => step.intensity === 'cooldown');
    
    if (!hasWarmup && workout.steps.length > 1) {
      errors.push('Multi-step workouts should include a warm-up');
    }
    
    if (!hasCooldown && workout.steps.length > 1) {
      errors.push('Multi-step workouts should include a cool-down');
    }
    
    // Validate individual steps
    workout.steps.forEach((step, index) => {
      if (step.step_index !== index) {
        errors.push(`Step ${index + 1}: Step index mismatch`);
      }
      
      if (!step.duration_type) {
        errors.push(`Step ${index + 1}: Duration type is required`);
      }
      
      if (step.duration_type === 'time' && !step.duration_value) {
        errors.push(`Step ${index + 1}: Duration value is required for time-based steps`);
      }
      
      if (step.duration_type === 'distance' && !step.duration_distance) {
        errors.push(`Step ${index + 1}: Distance is required for distance-based steps`);
      }
      
      if (step.target_type === 'pace' && !step.target_value) {
        errors.push(`Step ${index + 1}: Target pace is required for pace-based steps`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Estimate total workout duration in minutes
 */
export const estimateWorkoutDuration = (workout: FitWorkoutFile): number => {
  let totalMinutes = 0;
  
  workout.steps.forEach(step => {
    if (step.duration_type === 'time' && step.duration_value) {
      totalMinutes += step.duration_value / 60;
    } else if (step.duration_type === 'distance' && step.duration_distance) {
      // Estimate time based on distance and target pace
      let estimatedPace = 5.0; // Default 8:00/mile pace in m/s
      
      if (step.target_value && step.target_type === 'pace') {
        estimatedPace = step.target_value;
      } else if (step.intensity === 'warmup' || step.intensity === 'cooldown') {
        estimatedPace = 4.0; // Slower pace for warm-up/cool-down
      }
      
      const timeSeconds = step.duration_distance / estimatedPace;
      totalMinutes += timeSeconds / 60;
    } else {
      // For open duration steps, estimate based on intensity
      if (step.intensity === 'warmup') {
        totalMinutes += 10; // 10 minutes warmup
      } else if (step.intensity === 'cooldown') {
        totalMinutes += 5; // 5 minutes cooldown
      } else {
        totalMinutes += 20; // 20 minutes for main effort
      }
    }
  });
  
  return Math.round(totalMinutes);
};

/**
 * Create interval block (helper for WorkoutBuilder)
 */
export const createIntervalBlock = (
  intervalDistance: number,
  intervalPace: number,
  recoveryDuration: number,
  repeatCount: number
): FitWorkoutStep[] => {
  const steps: FitWorkoutStep[] = [];
  
  for (let i = 0; i < repeatCount; i++) {
    // Interval step
    steps.push({
      step_index: 0, // Will be updated when added to workout
      ...WORKOUT_STEP_TYPES.INTERVAL,
      duration_distance: intervalDistance,
      target_value: intervalPace,
      step_name: `Interval ${i + 1}`,
    });
    
    // Recovery step (except after last interval)
    if (i < repeatCount - 1) {
      steps.push({
        step_index: 0, // Will be updated when added to workout
        ...WORKOUT_STEP_TYPES.RECOVERY,
        duration_value: recoveryDuration,
        step_name: `Recovery ${i + 1}`,
      });
    }
  }
  
  return steps;
};