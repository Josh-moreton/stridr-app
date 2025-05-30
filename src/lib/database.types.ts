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
    };
  };
};
