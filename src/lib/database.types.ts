export type TrainingPlan = {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  race_distance: string;
  units: string;
  goal_time: string;
  created_at: string;
}

export type PaceCalculation = {
  id: string;
  plan_id: string;
  easy_pace: string;
  marathon_pace: string;
  threshold_pace: string;
  interval_pace: string;
  recovery_pace: string;
  long_pace: string;
}

export type WorkoutEvent = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  workout_type: string;
  distance?: number;
  duration?: number;
  pace?: string;
  training_plan_id?: string;
  status?: string;
  color?: string;
  all_day: boolean;
}

export type WorkoutFile = {
  id: string;
  user_id: string;
  file_type: string;
  manufacturer: string;
  product: string;
  serial_number?: number;
  time_created: string;
  workout_name: string;
  sport: string;
  capabilities?: number;
  num_valid_steps: number; // This stores the count, not the actual steps
  created_at: string;
  updated_at: string;
}

export type WorkoutStep = {
  id: string;
  workout_file_id: string;
  user_id: string;
  step_index: number;
  step_name?: string;
  message_index?: number;
  duration_type: 'time' | 'distance' | 'calories' | 'open' | 'repeat_until_steps_cmplt';
  duration_value?: number;
  duration_time?: string;
  duration_distance?: number;
  target_type: 'speed' | 'heart_rate' | 'power' | 'cadence' | 'open' | 'pace';
  target_value?: number;
  target_low?: number;
  target_high?: number;
  custom_target_value_low?: number;
  custom_target_value_high?: number;
  intensity: 'active' | 'rest' | 'warmup' | 'cooldown';
  repeat_steps?: number;
  repeat_type?: string;
  repeat_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type TrainingPlanItem = {
  id: string; // Primary key for the training plan item
  training_plan_id: string; // Foreign key to training_plans.id
  workout_file_id: string; // Foreign key to workout_files.id
  user_id: string; // Foreign key to auth.users.id, for ownership
  day_offset: number; // Defines which day of the plan this workout falls on (e.g., 0 for Day 1, 1 for Day 2)
  item_order: number; // Optional: for ordering multiple workouts on the same day_offset
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      training_plans: {
        Row: TrainingPlan;
        Insert: Omit<TrainingPlan, 'id' | 'created_at'>;
        Update: Partial<Omit<TrainingPlan, 'id' | 'created_at'>>;
      };
      pace_calculations: {
        Row: PaceCalculation;
        Insert: Omit<PaceCalculation, 'id'>;
        Update: Partial<Omit<PaceCalculation, 'id'>>;
      };
      workout_events: {
        Row: WorkoutEvent;
        Insert: Omit<WorkoutEvent, 'id'>;
        Update: Partial<Omit<WorkoutEvent, 'id'>>;
      };
      workout_files: {
        Row: WorkoutFile;
        Insert: Omit<WorkoutFile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkoutFile, 'id' | 'created_at' | 'updated_at'>>;
      };
      workout_steps: {
        Row: WorkoutStep;
        Insert: Omit<WorkoutStep, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkoutStep, 'id' | 'created_at' | 'updated_at'>>;
      };
      training_plan_items: { // New table for linking plans and workouts
        Row: TrainingPlanItem;
        Insert: Omit<TrainingPlanItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TrainingPlanItem, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};
