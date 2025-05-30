import { FitWorkoutFile, FitWorkoutStep, WORKOUT_STEP_TYPES } from './fit-workout-service';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: 'easy' | 'tempo' | 'interval' | 'long' | 'recovery';
  estimatedDuration: number; // minutes
  workout: FitWorkoutFile;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'easy-5k',
    name: 'Easy 5K Run',
    description: '5 kilometer easy pace run with warm-up and cool-down',
    category: 'easy',
    estimatedDuration: 35,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: 'Easy 5K Run',
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
          target_value: 4.5, // ~9:00/mile pace
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 300, // 5 minutes
        }
      ]
    }
  },
  {
    id: 'tempo-4x1k',
    name: '4x1K Tempo Intervals',
    description: '4 x 1km at tempo pace with 2-minute recovery jogs',
    category: 'tempo',
    estimatedDuration: 45,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '4x1K Tempo Intervals',
      sport: 'running',
      num_valid_steps: 5,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 900, // 15 minutes
        },
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.TEMPO_RUN,
          duration_distance: 1000, // 1km
          target_value: 5.5, // ~7:15/mile pace
          repeat_steps: 4,
          repeat_type: 'repeat_until_steps_cmplt',
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 120, // 2 minutes
          repeat_steps: 3, // 3 recovery periods (between 4 intervals)
        },
        {
          step_index: 3,
          ...WORKOUT_STEP_TYPES.EASY_RUN,
          duration_value: 600, // 10 minutes easy
        },
        {
          step_index: 4,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
        }
      ]
    }
  },
  {
    id: 'speed-8x400',
    name: '8x400m Speed Intervals',
    description: '8 x 400m at 5K pace with 90-second recovery jogs',
    category: 'interval',
    estimatedDuration: 50,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '8x400m Speed Intervals',
      sport: 'running',
      num_valid_steps: 5,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 1200, // 20 minutes
        },
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400, // 400m
          target_value: 6.25, // ~6:26/mile pace (5K pace)
          repeat_steps: 8,
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 90, // 90 seconds
          repeat_steps: 7, // 7 recovery periods
        },
        {
          step_index: 3,
          ...WORKOUT_STEP_TYPES.EASY_RUN,
          duration_value: 600, // 10 minutes easy
        },
        {
          step_index: 4,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
        }
      ]
    }
  },
  {
    id: 'recovery-30min',
    name: '30-Minute Recovery Run',
    description: 'Easy 30-minute recovery run',
    category: 'recovery',
    estimatedDuration: 30,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '30-Minute Recovery Run',
      sport: 'running',
      num_valid_steps: 1,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.EASY_RUN,
          duration_value: 1800, // 30 minutes
          target_value: 4.0, // ~10:00/mile pace
          step_name: 'Recovery Run',
        }
      ]
    }
  }
];

export const getTemplatesByCategory = (category: string): WorkoutTemplate[] => {
  return WORKOUT_TEMPLATES.filter(template => template.category === category);
};

export const getTemplateById = (id: string): WorkoutTemplate | undefined => {
  return WORKOUT_TEMPLATES.find(template => template.id === id);
};

export const getAllCategories = (): string[] => {
  const categories = WORKOUT_TEMPLATES.map(template => template.category);
  return [...new Set(categories)]; // Remove duplicates
};
