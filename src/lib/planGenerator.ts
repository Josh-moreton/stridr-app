import { TrainingPaces } from './paceCalculator';

export interface PlanConfiguration {
  raceName: string;
  raceDistance: string; // '5k', '10k', 'Half Marathon', 'Marathon', or 'Custom'
  customRaceDistanceValue?: string;
  customRaceDistanceUnits?: 'km' | 'miles';
  raceDate: string; // YYYY-MM-DD
  trainingPaces: TrainingPaces;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'; // User's running experience
  weeklyVolume?: 'low' | 'medium' | 'high'; // Current weekly running volume
}

export enum RunType {
  Easy = 'Easy',
  Tempo = 'Tempo',
  Interval = 'Interval',
  Long = 'Long',
  Rest = 'Rest',
  Recovery = 'Recovery',
  Fartlek = 'Fartlek',
  HillRepeats = 'Hill Repeats',
  ProgressionRun = 'Progression Run',
}

export interface WorkoutStep {
  type: 'WarmUp' | 'Run' | 'Recovery' | 'CoolDown' | 'ActiveRecovery' | 'Interval' | 'Rest';
  duration?: number; // in seconds
  distance?: number; // in meters
  targetPace?: { minPerKm: number; maxPerKm: number }; // Optional, for specific segments
  description?: string;
  repetitions?: number; // For interval sets
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
  totalWeeklyDistance?: number; // in meters
  phase?: 'Base' | 'Build' | 'Peak' | 'Taper'; // Training phase
}

export interface TrainingPlan {
  planConfiguration: PlanConfiguration;
  totalWeeks: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (Race Date)
  weeklySchedules: WeeklySchedule[];
  planSummary?: string; // Overall plan description
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
 * Gets race distance in meters for training calculations
 */
const getRaceDistanceMeters = (raceDistance: string, customValue?: string, customUnits?: 'km' | 'miles'): number => {
  switch (raceDistance.toLowerCase()) {
    case '5k':
      return 5000;
    case '10k':
      return 10000;
    case 'half marathon':
    case 'half-marathon':
      return 21097;
    case 'marathon':
      return 42195;
    case 'custom':
      if (customValue) {
        const value = parseFloat(customValue);
        return customUnits === 'miles' ? value * 1609.34 : value * 1000;
      }
      return 10000; // Default to 10k
    default:
      return 10000;
  }
};

/**
 * Determines base weekly volume based on race distance and experience level
 */
const getBaseWeeklyVolume = (
  raceDistanceMeters: number, 
  experienceLevel: string = 'intermediate'
): number => {
  const baseVolumes = {
    beginner: { 5000: 20000, 10000: 25000, 21097: 35000, 42195: 50000 },
    intermediate: { 5000: 30000, 10000: 40000, 21097: 50000, 42195: 70000 },
    advanced: { 5000: 45000, 10000: 60000, 21097: 75000, 42195: 100000 }
  };

  const levelVolumes = baseVolumes[experienceLevel as keyof typeof baseVolumes] || baseVolumes.intermediate;
  
  // Find closest race distance
  const distances = Object.keys(levelVolumes).map(Number).sort((a, b) => a - b);
  const closestDistance = distances.reduce((prev, curr) => 
    Math.abs(curr - raceDistanceMeters) < Math.abs(prev - raceDistanceMeters) ? curr : prev
  );
  
  return levelVolumes[closestDistance as keyof typeof levelVolumes];
};

/**
 * Calculates training phases based on total weeks
 */
const calculateTrainingPhases = (totalWeeks: number) => {
  if (totalWeeks <= 6) {
    return { base: 2, build: 3, peak: 1, taper: 0 };
  } else if (totalWeeks <= 12) {
    return { base: Math.floor(totalWeeks * 0.4), build: Math.floor(totalWeeks * 0.4), peak: Math.floor(totalWeeks * 0.1), taper: Math.ceil(totalWeeks * 0.1) };
  } else if (totalWeeks <= 20) {
    return { base: Math.floor(totalWeeks * 0.45), build: Math.floor(totalWeeks * 0.35), peak: Math.floor(totalWeeks * 0.1), taper: Math.ceil(totalWeeks * 0.1) };
  } else {
    return { base: Math.floor(totalWeeks * 0.5), build: Math.floor(totalWeeks * 0.3), peak: Math.floor(totalWeeks * 0.1), taper: Math.ceil(totalWeeks * 0.1) };
  }
};

/**
 * Creates structured workout steps for different run types
 */
const createWorkoutSteps = (
  runType: RunType, 
  totalDuration: number, 
  totalDistance: number, 
  paces: TrainingPaces,
  weekPhase: string,
  weekNumber: number
): WorkoutStep[] => {
  const steps: WorkoutStep[] = [];

  switch (runType) {
    case RunType.Easy:
    case RunType.Recovery:
      steps.push({
        type: 'Run',
        duration: totalDuration,
        distance: totalDistance,
        targetPace: paces.easyPace,
        description: 'Easy conversational pace'
      });
      break;

    case RunType.Tempo:
      const warmupDuration = 10 * 60; // 10 minutes
      const cooldownDuration = 10 * 60; // 10 minutes
      const tempoDuration = totalDuration - warmupDuration - cooldownDuration;
      
      steps.push(
        {
          type: 'WarmUp',
          duration: warmupDuration,
          targetPace: paces.easyPace,
          description: '10-minute easy warm-up'
        },
        {
          type: 'Run',
          duration: tempoDuration,
          targetPace: paces.tempoPace,
          description: 'Tempo effort - comfortably hard'
        },
        {
          type: 'CoolDown',
          duration: cooldownDuration,
          targetPace: paces.easyPace,
          description: '10-minute easy cool-down'
        }
      );
      break;

    case RunType.Interval:
      const intervalWarmup = 15 * 60; // 15 minutes
      const intervalCooldown = 10 * 60; // 10 minutes
      const intervalWorkTime = totalDuration - intervalWarmup - intervalCooldown;
      
      // Determine interval structure based on phase and week
      let intervalDistance = 800; // meters
      let recoveryTime = 90; // seconds
      let reps = Math.floor(intervalWorkTime / (3 * 60 + recoveryTime)); // 3-minute intervals
      
      if (weekPhase === 'Build' || weekPhase === 'Peak') {
        if (weekNumber % 3 === 1) {
          // 800m intervals
          intervalDistance = 800;
          recoveryTime = 90;
          reps = Math.max(4, Math.min(8, reps));
        } else if (weekNumber % 3 === 2) {
          // 1200m intervals
          intervalDistance = 1200;
          recoveryTime = 120;
          reps = Math.max(3, Math.min(6, Math.floor(reps * 0.75)));
        } else {
          // 400m repeats
          intervalDistance = 400;
          recoveryTime = 60;
          reps = Math.max(6, Math.min(12, reps * 2));
        }
      }

      steps.push(
        {
          type: 'WarmUp',
          duration: intervalWarmup,
          targetPace: paces.easyPace,
          description: '15-minute easy warm-up'
        },
        {
          type: 'Interval',
          distance: intervalDistance,
          targetPace: paces.intervalPace,
          repetitions: reps,
          description: `${reps} x ${intervalDistance}m @ 5K pace w/ ${recoveryTime}s recovery`
        },
        {
          type: 'CoolDown',
          duration: intervalCooldown,
          targetPace: paces.easyPace,
          description: '10-minute easy cool-down'
        }
      );
      break;

    case RunType.Long:
      const longRunSteps: WorkoutStep[] = [];
      
      if (totalDuration > 75 * 60) { // For runs longer than 75 minutes
        // Start easy, finish at marathon pace for last 20-30%
        const easyPortion = Math.floor(totalDuration * 0.75);
        const tempoPortion = totalDuration - easyPortion;
        
        longRunSteps.push(
          {
            type: 'Run',
            duration: easyPortion,
            targetPace: paces.longRunPace,
            description: 'Start easy and build'
          },
          {
            type: 'Run',
            duration: tempoPortion,
            targetPace: paces.tempoPace,
            description: 'Finish strong at marathon pace'
          }
        );
      } else {
        longRunSteps.push({
          type: 'Run',
          duration: totalDuration,
          distance: totalDistance,
          targetPace: paces.longRunPace,
          description: 'Steady long run pace'
        });
      }
      
      steps.push(...longRunSteps);
      break;

    case RunType.Fartlek:
      steps.push(
        {
          type: 'WarmUp',
          duration: 10 * 60,
          targetPace: paces.easyPace,
          description: '10-minute easy warm-up'
        },
        {
          type: 'Run',
          duration: totalDuration - 20 * 60,
          description: 'Fartlek: 1-3min pickups when you feel good, recover as needed'
        },
        {
          type: 'CoolDown',
          duration: 10 * 60,
          targetPace: paces.easyPace,
          description: '10-minute easy cool-down'
        }
      );
      break;

    case RunType.HillRepeats:
      steps.push(
        {
          type: 'WarmUp',
          duration: 15 * 60,
          targetPace: paces.easyPace,
          description: '15-minute easy warm-up'
        },
        {
          type: 'Interval',
          duration: 90, // 90 seconds uphill
          repetitions: Math.floor((totalDuration - 25 * 60) / (90 + 120)), // 2min recovery
          description: 'Hill repeats: 90s uphill @ 5K effort, jog down recovery'
        },
        {
          type: 'CoolDown',
          duration: 10 * 60,
          targetPace: paces.easyPace,
          description: '10-minute easy cool-down'
        }
      );
      break;

    case RunType.ProgressionRun:
      const segments = 3;
      const segmentDuration = totalDuration / segments;
      
      steps.push(
        {
          type: 'Run',
          duration: segmentDuration,
          targetPace: paces.easyPace,
          description: 'Start easy'
        },
        {
          type: 'Run',
          duration: segmentDuration,
          targetPace: paces.tempoPace,
          description: 'Build to tempo pace'
        },
        {
          type: 'Run',
          duration: segmentDuration,
          targetPace: paces.intervalPace,
          description: 'Finish strong'
        }
      );
      break;

    default:
      steps.push({
        type: 'Run',
        duration: totalDuration,
        distance: totalDistance,
        targetPace: paces.easyPace,
        description: 'Easy run'
      });
  }

  return steps;
};

/**
 * Generates a comprehensive training plan based on modern coaching principles.
 * @param config The plan configuration.
 * @param currentDate The current date (for calculating plan start).
 * @returns A generated TrainingPlan or null if inputs are invalid.
 */
export const generateTrainingPlan = (
  config: PlanConfiguration,
  currentDate: Date = new Date()
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

  // Get race distance and base training parameters
  const raceDistanceMeters = getRaceDistanceMeters(
    config.raceDistance, 
    config.customRaceDistanceValue, 
    config.customRaceDistanceUnits
  );
  
  const experienceLevel = config.experienceLevel || 'intermediate';
  const baseWeeklyVolume = getBaseWeeklyVolume(raceDistanceMeters, experienceLevel);
  const phases = calculateTrainingPhases(totalWeeks);

  const weeklySchedules: WeeklySchedule[] = [];
  let currentWeekStartDate = new Date(planStartDate);

  // Calculate weekly volume progression
  let currentPhase = 'Base';
  let phaseWeekCount = 0;

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
    const weekNumber = weekIndex + 1;
    
    // Determine current training phase
    if (weekNumber <= phases.base) {
      currentPhase = 'Base';
      phaseWeekCount = weekNumber;
    } else if (weekNumber <= phases.base + phases.build) {
      currentPhase = 'Build';
      phaseWeekCount = weekNumber - phases.base;
    } else if (weekNumber <= phases.base + phases.build + phases.peak) {
      currentPhase = 'Peak';
      phaseWeekCount = weekNumber - phases.base - phases.build;
    } else {
      currentPhase = 'Taper';
      phaseWeekCount = weekNumber - phases.base - phases.build - phases.peak;
    }

    // Calculate weekly volume with progression
    let weeklyVolume = baseWeeklyVolume;
    
    if (currentPhase === 'Base') {
      // Gradual build in base phase
      weeklyVolume = baseWeeklyVolume * (0.7 + (phaseWeekCount - 1) * 0.05);
    } else if (currentPhase === 'Build') {
      // Progressive overload in build phase (max 10% per week)
      const buildStartVolume = baseWeeklyVolume * 0.9;
      weeklyVolume = buildStartVolume * Math.pow(1.08, phaseWeekCount - 1); // 8% increase per week
    } else if (currentPhase === 'Peak') {
      // Maintain high volume in peak phase
      weeklyVolume = baseWeeklyVolume * 1.15;
    } else {
      // Taper phase - reduce volume significantly
      const taperReduction = 1 - (phaseWeekCount * 0.2); // 20% reduction per taper week
      weeklyVolume = baseWeeklyVolume * Math.max(taperReduction, 0.4); // Never below 40%
    }

    // Add deload weeks (every 4th week, except in taper)
    const isDeloadWeek = currentPhase !== 'Taper' && weekNumber % 4 === 0;
    if (isDeloadWeek) {
      weeklyVolume *= 0.75; // 25% reduction for deload
    }

    // Generate weekly schedule
    const weekStartDateString = currentWeekStartDate.toISOString().split('T')[0];
    const weekEndDate = new Date(currentWeekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEndDateString = weekEndDate.toISOString().split('T')[0];

    const weeklySchedule = generateWeeklySchedule({
      weekNumber,
      phase: currentPhase as 'Base' | 'Build' | 'Peak' | 'Taper',
      isDeloadWeek,
      weeklyVolume,
      raceDistanceMeters,
      experienceLevel,
      startDate: weekStartDateString,
      endDate: weekEndDateString,
      trainingPaces: config.trainingPaces,
      currentWeekStartDate: new Date(currentWeekStartDate)
    });

    weeklySchedules.push(weeklySchedule);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
  }

  // Generate plan summary
  const planSummary = generatePlanSummary(config, totalWeeks, phases, raceDistanceMeters);

  return {
    planConfiguration: config,
    totalWeeks,
    startDate: planStartDateString,
    endDate: config.raceDate,
    weeklySchedules,
    planSummary
  };
};

/**
 * Generates a weekly schedule based on training parameters
 */
function generateWeeklySchedule(params: {
  weekNumber: number;
  phase: 'Base' | 'Build' | 'Peak' | 'Taper';
  isDeloadWeek: boolean;
  weeklyVolume: number;
  raceDistanceMeters: number;
  experienceLevel: string;
  startDate: string;
  endDate: string;
  trainingPaces: TrainingPaces;
  currentWeekStartDate: Date;
}): WeeklySchedule {
  const runs: ScheduledRun[] = [];
  
  // Determine weekly structure based on phase and race distance
  const weeklyStructure = getWeeklyStructure(
    params.phase, 
    params.raceDistanceMeters, 
    params.experienceLevel,
    params.isDeloadWeek
  );

  // Distribute weekly volume across runs
  const runDistances = distributeWeeklyVolume(params.weeklyVolume, weeklyStructure);

  weeklyStructure.forEach((dayPlan, dayIndex) => {
    const runDate = new Date(params.currentWeekStartDate);
    runDate.setDate(runDate.getDate() + dayIndex);
    
    if (dayPlan.runType === RunType.Rest) {
      runs.push({
        date: runDate.toISOString().split('T')[0],
        dayOfWeek: runDate.getDay(),
        runType: RunType.Rest,
        description: "Rest Day - Complete rest or light cross-training",
        notes: "Focus on recovery, hydration, and nutrition"
      });
      return;
    }

    const distance = runDistances[dayIndex] || 0;
    const estimatedPace = getEstimatedPace(dayPlan.runType, params.trainingPaces);
    const duration = distance > 0 ? (distance / 1000) * estimatedPace * 60 : 0; // Convert to seconds

    const description = generateRunDescription(dayPlan.runType, distance, duration, params.phase);
    const steps = createWorkoutSteps(
      dayPlan.runType, 
      duration, 
      distance, 
      params.trainingPaces,
      params.phase,
      params.weekNumber
    );

    runs.push({
      date: runDate.toISOString().split('T')[0],
      dayOfWeek: runDate.getDay(),
      runType: dayPlan.runType,
      description,
      totalDuration: Math.round(duration),
      totalDistance: Math.round(distance),
      steps,
      notes: dayPlan.notes
    });
  });

  // Generate week summary
  const summary = generateWeekSummary(params.phase, params.weekNumber, params.isDeloadWeek);

  return {
    weekNumber: params.weekNumber,
    startDate: params.startDate,
    endDate: params.endDate,
    runs,
    summary,
    totalWeeklyDistance: Math.round(params.weeklyVolume),
    phase: params.phase
  };
}

/**
 * Determines weekly training structure based on phase and race distance
 */
function getWeeklyStructure(
  phase: string, 
  raceDistanceMeters: number, 
  experienceLevel: string,
  isDeloadWeek: boolean
): Array<{ runType: RunType; notes?: string }> {
  
  // Base structure: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  let structure: Array<{ runType: RunType; notes?: string }>;

  if (raceDistanceMeters <= 10000) {
    // 5K/10K structure - more speed work
    if (phase === 'Base') {
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Easy },
        { runType: RunType.Rest },
        { runType: RunType.Tempo, notes: "Build aerobic strength" },
        { runType: RunType.Easy },
        { runType: RunType.Easy },
        { runType: RunType.Long, notes: "Aerobic base building" }
      ];
    } else if (phase === 'Build') {
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Interval, notes: "VO2 max development" },
        { runType: RunType.Recovery },
        { runType: RunType.Tempo, notes: "Lactate threshold" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Long, notes: "Aerobic support" }
      ];
    } else if (phase === 'Peak') {
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Interval, notes: "Race pace practice" },
        { runType: RunType.Recovery },
        { runType: RunType.Fartlek, notes: "Race simulation" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Long }
      ];
    } else { // Taper
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Interval, notes: "Maintain sharpness" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Easy, notes: "Pre-race shakeout" }
      ];
    }
  } else {
    // Half Marathon/Marathon structure - more endurance
    if (phase === 'Base') {
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Easy },
        { runType: RunType.Easy },
        { runType: RunType.Tempo, notes: "Aerobic development" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Long, notes: "Endurance building" }
      ];
    } else if (phase === 'Build') {
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Tempo, notes: "Lactate threshold" },
        { runType: RunType.Easy },
        { runType: RunType.Interval, notes: "VO2 max work" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Long, notes: "Race pace segments" }
      ];
    } else if (phase === 'Peak') {
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Tempo, notes: "Marathon pace practice" },
        { runType: RunType.Easy },
        { runType: RunType.ProgressionRun, notes: "Race simulation" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Long, notes: "Peak long run" }
      ];
    } else { // Taper
      structure = [
        { runType: RunType.Easy },
        { runType: RunType.Tempo, notes: "Maintain fitness" },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Rest },
        { runType: RunType.Easy },
        { runType: RunType.Easy, notes: "Pre-race preparation" }
      ];
    }
  }

  // Modify for deload weeks
  if (isDeloadWeek && phase !== 'Taper') {
    structure = structure.map(day => 
      day.runType === RunType.Interval || day.runType === RunType.Tempo 
        ? { runType: RunType.Easy, notes: "Deload week - easy effort" }
        : day
    );
  }

  return structure;
}

/**
 * Distributes weekly volume across different run types
 */
function distributeWeeklyVolume(
  totalVolume: number, 
  structure: Array<{ runType: RunType; notes?: string }>
): number[] {
  const distances: number[] = new Array(7).fill(0);
  
  // Calculate relative intensities for volume distribution
  const volumeWeights: number[] = structure.map(day => {
    switch (day.runType) {
      case RunType.Long: return 0.35; // 35% of weekly volume
      case RunType.Tempo: return 0.15; // 15% of weekly volume
      case RunType.Interval: return 0.12; // 12% of weekly volume
      case RunType.Easy: return 0.12; // 12% each
      case RunType.Recovery: return 0.08; // 8% of weekly volume
      case RunType.Fartlek: return 0.12;
      case RunType.HillRepeats: return 0.10;
      case RunType.ProgressionRun: return 0.15;
      case RunType.Rest: return 0;
      default: return 0.10;
    }
  });

  const totalWeight = volumeWeights.reduce((sum, weight) => sum + weight, 0);
  
  // Distribute volume proportionally
  structure.forEach((day, index) => {
    if (day.runType !== RunType.Rest) {
      distances[index] = (volumeWeights[index] / totalWeight) * totalVolume;
    }
  });

  return distances;
}

/**
 * Gets estimated pace for run type in minutes per km
 */
function getEstimatedPace(runType: RunType, paces: TrainingPaces): number {
  switch (runType) {
    case RunType.Easy:
    case RunType.Recovery:
      return (paces.easyPace.minPerKm + paces.easyPace.maxPerKm) / 2 / 1000; // Convert to minutes
    case RunType.Long:
      return (paces.longRunPace.minPerKm + paces.longRunPace.maxPerKm) / 2 / 1000;
    case RunType.Tempo:
    case RunType.ProgressionRun:
      return (paces.tempoPace.minPerKm + paces.tempoPace.maxPerKm) / 2 / 1000;
    case RunType.Interval:
    case RunType.Fartlek:
    case RunType.HillRepeats:
      return (paces.intervalPace.minPerKm + paces.intervalPace.maxPerKm) / 2 / 1000;
    default:
      return (paces.easyPace.minPerKm + paces.easyPace.maxPerKm) / 2 / 1000;
  }
}

/**
 * Generates descriptive text for runs
 */
function generateRunDescription(
  runType: RunType, 
  distance: number, 
  duration: number, 
  phase: string
): string {
  const distanceKm = Math.round(distance / 100) / 10; // Round to 1 decimal
  const durationMin = Math.round(duration / 60);

  switch (runType) {
    case RunType.Easy:
      return `Easy Run: ${distanceKm}km (${durationMin} min)`;
    case RunType.Recovery:
      return `Recovery Run: ${distanceKm}km (${durationMin} min) - Very easy pace`;
    case RunType.Long:
      return `Long Run: ${distanceKm}km (${durationMin} min) - Steady aerobic effort`;
    case RunType.Tempo:
      return `Tempo Run: ${durationMin} min total - Comfortably hard effort`;
    case RunType.Interval:
      return `Interval Training: ${durationMin} min total - High intensity repeats`;
    case RunType.Fartlek:
      return `Fartlek: ${durationMin} min - Playful speed work`;
    case RunType.HillRepeats:
      return `Hill Repeats: ${durationMin} min - Strength and power`;
    case RunType.ProgressionRun:
      return `Progression Run: ${distanceKm}km - Start easy, finish strong`;
    default:
      return `Run: ${distanceKm}km (${durationMin} min)`;
  }
}

/**
 * Generates week summary based on phase and focus
 */
function generateWeekSummary(phase: string, weekNumber: number, isDeloadWeek: boolean): string {
  if (isDeloadWeek) {
    return `Week ${weekNumber} - Deload: Recovery and adaptation`;
  }

  switch (phase) {
    case 'Base':
      return `Week ${weekNumber} - Base Building: Aerobic development and injury prevention`;
    case 'Build':
      return `Week ${weekNumber} - Build Phase: Lactate threshold and VO2 max development`;
    case 'Peak':
      return `Week ${weekNumber} - Peak Phase: Race pace practice and specificity`;
    case 'Taper':
      return `Week ${weekNumber} - Taper: Maintain fitness while recovering for race day`;
    default:
      return `Week ${weekNumber}`;
  }
}

/**
 * Generates overall plan summary
 */
function generatePlanSummary(
  config: PlanConfiguration, 
  totalWeeks: number, 
  phases: any, 
  raceDistanceMeters: number
): string {
  const raceDistanceKm = Math.round(raceDistanceMeters / 100) / 10;
  const experienceLevel = config.experienceLevel || 'intermediate';
  
  return `${totalWeeks}-week ${config.raceDistance} training plan for ${experienceLevel} runners. ` +
    `Phase breakdown: ${phases.base} weeks base building, ${phases.build} weeks specific development, ` +
    `${phases.peak} weeks peak training, ${phases.taper} weeks taper. ` +
    `Target race: ${config.raceName} (${raceDistanceKm}km) on ${config.raceDate}. ` +
    `Plan emphasizes progressive overload, proper recovery, and race-specific adaptations.`;
}

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
