import { TrainingPaces } from './paceCalculator';

export interface PlanConfiguration {
  raceName: string;
  raceDistance: string; // '5k', '10k', 'Half Marathon', 'Marathon', or 'Custom'
  customRaceDistanceValue?: string;
  customRaceDistanceUnits?: 'km' | 'miles';
  raceDate: string; // YYYY-MM-DD
  trainingPaces: TrainingPaces;
  // Potentially add user experience level or weekly volume preference later
}

export enum RunType {
  Easy = 'Easy',
  Tempo = 'Tempo',
  Interval = 'Interval',
  Long = 'Long',
  Rest = 'Rest',
}

export interface WorkoutStep {
  type: 'WarmUp' | 'Run' | 'Recovery' | 'CoolDown' | 'ActiveRecovery';
  duration?: number; // in seconds
  distance?: number; // in meters
  targetPace?: { minPerKm: number; maxPerKm: number }; // Optional, for specific segments
  description?: string;
}

export interface ScheduledRun {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  runType: RunType;
  description: string; // e.g., "Easy Run: 5km" or "Intervals: 5x800m"
  totalDuration?: number; // in seconds
  totalDistance?: number; // in meters
  steps?: WorkoutStep[]; // For structured workouts like Tempo or Intervals
  notes?: string; // Any specific notes for the run
}

export interface WeeklySchedule {
  weekNumber: number; // 1-indexed
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  runs: ScheduledRun[];
  summary?: string; // e.g., "Focus: Building endurance, 3 quality runs"
}

export interface TrainingPlan {
  planConfiguration: PlanConfiguration;
  totalWeeks: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (Race Date)
  weeklySchedules: WeeklySchedule[];
  // Potentially add overall plan summary or goals
}

/**
 * Calculates the total number of weeks between two dates.
 * @param startDateString The start date (YYYY-MM-DD).
 * @param endDateString The end date (YYYY-MM-DD).
 * @returns The total number of full weeks.
 */
const calculateTotalWeeks = (startDateString: string, endDateString: string): number => {
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
    return 0;
  }
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const differenceInMilliseconds = endDate.getTime() - startDate.getTime();
  return Math.floor(differenceInMilliseconds / millisecondsPerWeek);
};

/**
 * Generates a training plan based on user configuration.
 * @param config The plan configuration.
 * @param currentDate The current date (for calculating plan start).
 * @returns A generated TrainingPlan or null if inputs are invalid.
 */
export const generateTrainingPlan = (
  config: PlanConfiguration,
  currentDate: Date = new Date() // Default to today, can be overridden for testing
): TrainingPlan | null => {
  if (!config.raceDate || !config.trainingPaces) {
    console.error("Invalid configuration: Missing race date or training paces.");
    return null;
  }

  const planStartDate = new Date(currentDate);
  planStartDate.setDate(planStartDate.getDate() + 1); // Start plan tomorrow
  const planStartDateString = planStartDate.toISOString().split('T')[0];

  const totalWeeks = calculateTotalWeeks(planStartDateString, config.raceDate);

  if (totalWeeks <= 0) {
    console.error("Race date must be in the future, allowing for at least one week of training.");
    return null;
  }

  const weeklySchedules: WeeklySchedule[] = [];

  // Basic weekly structure: Mon (Easy), Tue (Tempo), Wed (Easy), Thu (Interval), Fri (Rest), Sat (Easy), Sun (Long)
  // This is a simplification. A real implementation would vary this based on totalWeeks, raceDistance, user experience etc.
  const runDistribution = [
    { day: 1, type: RunType.Easy, offset: 0 }, // Monday
    { day: 2, type: RunType.Tempo, offset: 1 }, // Tuesday
    { day: 3, type: RunType.Easy, offset: 2 }, // Wednesday
    { day: 4, type: RunType.Interval, offset: 3 }, // Thursday
    { day: 5, type: RunType.Rest, offset: 4 }, // Friday
    { day: 6, type: RunType.Easy, offset: 5 }, // Saturday
    { day: 0, type: RunType.Long, offset: 6 }, // Sunday
  ];

  let currentWeekStartDate = new Date(planStartDate);

  for (let i = 0; i < totalWeeks; i++) {
    const weekNumber = i + 1;
    const runs: ScheduledRun[] = [];
    const weekStartDateString = currentWeekStartDate.toISOString().split('T')[0];
    const weekEndDate = new Date(currentWeekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEndDateString = weekEndDate.toISOString().split('T')[0];

    // Taper for the last 1-2 weeks (very basic taper)
    const isTaperWeek = totalWeeks > 2 && weekNumber > totalWeeks - 2;
    const taperFactor = isTaperWeek ? 0.7 : 1; // Reduce volume by 30% in taper

    runDistribution.forEach(dist => {
      const runDate = new Date(currentWeekStartDate);
      runDate.setDate(runDate.getDate() + dist.offset);

      // Adjust day for Sunday (0) if planStartDate is not a Monday
      // This basic offset logic might need refinement for perfect day alignment
      // depending on the exact start day of the week for the plan.
      // For simplicity, we assume planStartDate aligns with the conceptual 'start of the week'.

      let description = `${dist.type} Run`;
      let totalDistance;
      let totalDuration;

      switch (dist.type) {
        case RunType.Easy:
          description = `Easy Run: ${30 * taperFactor} minutes`;
          totalDuration = 30 * 60 * taperFactor;
          break;
        case RunType.Tempo:
          description = `Tempo Run: 10 min WU, ${20 * taperFactor} min @ Tempo, 10 min CD`;
          totalDuration = (10 + 20 + 10) * 60 * taperFactor;
          break;
        case RunType.Interval:
          description = `Intervals: 10 min WU, ${5 * taperFactor}x3min @ Interval w/ 2min recovery, 10 min CD`;
          totalDuration = (10 + (5 * 3) + (4 * 2) + 10) * 60 * taperFactor; // 5 reps have 4 recoveries
          break;
        case RunType.Long:
          // Simple progression: increase long run by 10 mins each week, cap at 2.5 hours, then taper
          const baseLongRunDuration = Math.min(60 + (weekNumber -1) * 10, 150); // in minutes
          description = `Long Run: ${baseLongRunDuration * taperFactor} minutes`;
          totalDuration = baseLongRunDuration * 60 * taperFactor;
          break;
        case RunType.Rest:
          description = "Rest Day";
          break;
      }

      runs.push({
        date: runDate.toISOString().split('T')[0],
        dayOfWeek: runDate.getDay(),
        runType: dist.type,
        description,
        totalDuration: dist.type !== RunType.Rest ? totalDuration : undefined,
        // totalDistance will be calculated later based on pace and duration or defined by workout steps
      });
    });

    weeklySchedules.push({
      weekNumber,
      startDate: weekStartDateString,
      endDate: weekEndDateString,
      runs,
      summary: isTaperWeek ? "Taper Week" : `Week ${weekNumber} of ${totalWeeks}`,
    });

    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
  }

  return {
    planConfiguration: config,
    totalWeeks,
    startDate: planStartDateString,
    endDate: config.raceDate,
    weeklySchedules,
  };
};

// Example usage (for testing, can be removed later)
/*
const exampleConfig: PlanConfiguration = {
  raceName: "My 10K Race",
  raceDistance: "10k",
  raceDate: "2025-08-30", // Ensure this is in the future from "currentDate"
  trainingPaces: { // Dummy paces, replace with actual calculated paces
    easyPace: { minPerKm: 6.0, maxPerKm: 6.5, minPerMile: 9.66, maxPerMile: 10.46 },
    tempoPace: { minPerKm: 5.0, maxPerKm: 5.3, minPerMile: 8.05, maxPerMile: 8.53 },
    intervalPace: { minPerKm: 4.0, maxPerKm: 4.3, minPerMile: 6.44, maxPerMile: 6.92 },
    longRunPace: { minPerKm: 6.2, maxPerKm: 6.8, minPerMile: 9.98, maxPerMile: 10.94 },
    vdot: 50
  }
};

const today = new Date("2025-05-30"); // Fixed date for consistent testing
const plan = generateTrainingPlan(exampleConfig, today);

if (plan) {
  console.log("Generated Training Plan:", JSON.stringify(plan, null, 2));
  console.log(`Total weeks in plan: ${plan.totalWeeks}`);
} else {
  console.log("Failed to generate training plan.");
}
*/
