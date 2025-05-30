import { FitWorkoutFile, WORKOUT_STEP_TYPES } from './fit-workout-service';

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
  },
  {
    id: 'tempo-4x1mile',
    name: '4x1 Mile Tempo Intervals',
    description: '1 mile tempo intervals with 90 second recovery',
    category: 'tempo',
    estimatedDuration: 55,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '4x1 Mile Tempo',
      sport: 'running',
      num_valid_steps: 10,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 900, // 15 minutes
        },
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 1609, // 1 mile
          target_value: 5.2, // ~7:40/mile tempo pace
          step_name: 'Tempo Interval 1',
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 90, // 90 seconds
        },
        {
          step_index: 3,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 1609,
          target_value: 5.2,
          step_name: 'Tempo Interval 2',
        },
        {
          step_index: 4,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 90,
        },
        {
          step_index: 5,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 1609,
          target_value: 5.2,
          step_name: 'Tempo Interval 3',
        },
        {
          step_index: 6,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 90,
        },
        {
          step_index: 7,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 1609,
          target_value: 5.2,
          step_name: 'Tempo Interval 4',
        },
        {
          step_index: 8,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 180, // 3 minutes
        },
        {
          step_index: 9,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
        }
      ]
    }
  },
  {
    id: 'speed-8x400m',
    name: '8x400m Speed Intervals',
    description: '400m speed intervals with 200m jog recovery',
    category: 'interval',
    estimatedDuration: 45,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '8x400m Speed',
      sport: 'running',
      num_valid_steps: 18,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 900, // 15 minutes
        },
        // Interval 1
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0, // ~6:40/mile 5K pace
          step_name: '400m Interval 1',
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 2
        {
          step_index: 3,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 2',
        },
        {
          step_index: 4,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 3
        {
          step_index: 5,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 3',
        },
        {
          step_index: 6,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 4
        {
          step_index: 7,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 4',
        },
        {
          step_index: 8,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 5
        {
          step_index: 9,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 5',
        },
        {
          step_index: 10,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 6
        {
          step_index: 11,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 6',
        },
        {
          step_index: 12,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 7
        {
          step_index: 13,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 7',
        },
        {
          step_index: 14,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_distance: 200,
        },
        // Interval 8
        {
          step_index: 15,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_distance: 400,
          target_value: 6.0,
          step_name: '400m Interval 8',
        },
        {
          step_index: 16,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 180, // 3 minutes
        },
        {
          step_index: 17,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
        }
      ]
    }
  },
  {
    id: 'long-run-18mile',
    name: '18 Mile Long Run',
    description: 'Progressive long run with negative split',
    category: 'long',
    estimatedDuration: 150,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '18 Mile Long Run',
      sport: 'running',
      num_valid_steps: 4,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 900, // 15 minutes
        },
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.EASY_RUN,
          duration_distance: 14484, // 9 miles
          target_value: 4.2, // ~9:30/mile easy pace
          step_name: 'Easy First Half',
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.EASY_RUN,
          duration_distance: 14484, // 9 miles
          target_value: 4.6, // ~8:40/mile progressive pace
          step_name: 'Progressive Second Half',
        },
        {
          step_index: 3,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
        }
      ]
    }
  },
  {
    id: 'fartlek-pyramid',
    name: 'Pyramid Fartlek',
    description: '1-2-3-4-3-2-1 minute pyramid fartlek',
    category: 'interval',
    estimatedDuration: 60,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: 'Pyramid Fartlek',
      sport: 'running',
      num_valid_steps: 16,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 900, // 15 minutes
        },
        // 1 minute
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 60,
          target_value: 5.8, // ~6:53/mile
          step_name: '1 Minute Hard',
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 60,
        },
        // 2 minutes
        {
          step_index: 3,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 120,
          target_value: 5.6, // ~7:09/mile
          step_name: '2 Minutes Hard',
        },
        {
          step_index: 4,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 120,
        },
        // 3 minutes
        {
          step_index: 5,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 180,
          target_value: 5.4, // ~7:24/mile
          step_name: '3 Minutes Hard',
        },
        {
          step_index: 6,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 180,
        },
        // 4 minutes
        {
          step_index: 7,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 240,
          target_value: 5.2, // ~7:40/mile
          step_name: '4 Minutes Hard',
        },
        {
          step_index: 8,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 240,
        },
        // 3 minutes
        {
          step_index: 9,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 180,
          target_value: 5.4,
          step_name: '3 Minutes Hard',
        },
        {
          step_index: 10,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 180,
        },
        // 2 minutes
        {
          step_index: 11,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 120,
          target_value: 5.6,
          step_name: '2 Minutes Hard',
        },
        {
          step_index: 12,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 120,
        },
        // 1 minute
        {
          step_index: 13,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 60,
          target_value: 5.8,
          step_name: '1 Minute Hard',
        },
        {
          step_index: 14,
          ...WORKOUT_STEP_TYPES.RECOVERY,
          duration_value: 300, // 5 minutes
        },
        {
          step_index: 15,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
        }
      ]
    }
  },
  {
    id: 'tempo-threshold-20min',
    name: '20-Minute Tempo Run',
    description: 'Sustained 20-minute threshold tempo effort',
    category: 'tempo',
    estimatedDuration: 45,
    workout: {
      file_type: 'workout',
      manufacturer: 'stridr',
      product: 'stridr-app',
      time_created: new Date(),
      workout_name: '20-Minute Tempo',
      sport: 'running',
      num_valid_steps: 3,
      steps: [
        {
          step_index: 0,
          ...WORKOUT_STEP_TYPES.WARMUP,
          duration_value: 900, // 15 minutes
        },
        {
          step_index: 1,
          ...WORKOUT_STEP_TYPES.INTERVAL,
          duration_value: 1200, // 20 minutes
          target_value: 5.1, // ~7:50/mile threshold pace
          step_name: '20-Minute Tempo',
        },
        {
          step_index: 2,
          ...WORKOUT_STEP_TYPES.COOLDOWN,
          duration_value: 600, // 10 minutes
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
  return ['easy', 'recovery', 'tempo', 'interval', 'long'];
};