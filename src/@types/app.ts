export type PlanSummary = [string, string, RaceType];

export type Units = "mi" | "km";

export interface PlanDates {
  start: Date; // first day of first week we will render
  planStartDate: Date; // day the race plan will start
  planEndDate: Date; // day the race plan will end
  end: Date; // last day of the last week we will render
  weekCount: number;
}

export type Milestone = {
  name: string;
  distance: number;
};

export type RaceType =
  | "Base"
  | "Multiple Distances"
  | "Marathon"
  | "Half Marathon"
  | "5K"
  | "10K"
  | "15K/10M";

export type RaceDistance = {
  name: string;
  distance: number;
  defaultTime: number;
};

export interface DayDetails {
  date: string;
  workouts: PlannedWorkout[];
  notes?: string;
}

export interface PlannedWorkout {
  id: string;
  name: string;
  description?: string;
  type: string;
  distance?: number;
  duration?: number;
  paceTarget?: string;
  intensity?: string;
  completed?: boolean;
}

export interface WeekSchedule {
  description: string | undefined;
  workouts: PlannedWorkout[]; // guaranteed to be length 7
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  units: Units;
  type: RaceType;
  schedule: WeekSchedule[];
  source: string;
}

export type Tags =
  | "Rest"
  | "Run"
  | "Cross Train"
  | "Hills"
  | "Speedwork"
  | "Long Run"
  | "Race";

export interface Day<T> {
  date: Date;
  event: T | undefined;
}

export interface Week<T> {
  weekNum: number;
  dist: number;
  desc: string;
  days: Day<T>[];
}

// Pace calculation types
export interface PaceSettings {
  raceDistance: string;
  goalTime: string;
  units: Units;
}

export interface PaceZones {
  easy: { min: number; sec: number };
  marathon: { min: number; sec: number };
  threshold: { min: number; sec: number };
  interval: { min: number; sec: number };
  recovery: { min: number; sec: number };
  long?: { min: number; sec: number };
}

export type PaceZoneKey = keyof PaceZones; // Added PaceZoneKey
