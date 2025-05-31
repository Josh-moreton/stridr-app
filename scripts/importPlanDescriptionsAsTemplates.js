const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- Environment Variable Loading ---
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

console.log(`Attempting to load .env from: ${envPath}`);
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.error("Error loading .env file:", dotenvResult.error);
}

// --- Configuration ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log the values directly after attempting to load and assign
console.log(`SCRIPT_LOG: SUPABASE_URL = '${SUPABASE_URL}'`);
console.log(`SCRIPT_LOG: SUPABASE_SERVICE_ROLE_KEY = '${SUPABASE_SERVICE_ROLE_KEY ? '********' : 'MISSING_OR_EMPTY'}'`); // Don't log the actual key

const PLANS_DIRECTORY = path.join(projectRoot, 'plans', 'pfitz', 'marathon');
const DEFAULT_USER_ID = null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase URL or Service Role Key is missing. Check your .env file and its content.");
  console.error(`Evaluated SUPABASE_URL: '${SUPABASE_URL}'`);
  console.error(`Evaluated SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY ? "Exists" : "MISSING_OR_EMPTY"}'`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Helper: Define FitWorkoutFile & FitWorkoutStep (simplified for script) ---
// Ideally, import these from your actual @/lib/fit-workout-service
/**
 * @typedef {Object} FitWorkoutStep
 * @property {number} [step_index]
 * @property {string} [step_name]
 * @property {string} intensity - e.g., 'warmup', 'active', 'rest', 'cooldown'
 * @property {string} duration_type - e.g., 'time', 'distance', 'open'
 * @property {number} [duration_value] - seconds for time
 * @property {number} [duration_distance] - meters for distance
 * @property {string} [target_type] - e.g., 'pace', 'heart_rate_zone', 'open'
 * @property {number} [target_value] - m/s for pace
 * @property {number} [target_low]
 * @property {number} [target_high]
 * @property {string} [target_custom_value] - e.g., "THRESHOLD_PACE"
 * @property {number} [repeat_steps]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} FitWorkoutFile
 * @property {string} [id] - UUID
 * @property {string} workout_name
 * @property {string} [category] - e.g., 'easy', 'interval', 'tempo'
 * @property {string} [description]
 * @property {FitWorkoutStep[]} steps
 * @property {number} num_valid_steps
 * @property {Date} [time_created]
 */

// --- Mocked WORKOUT_STEP_TYPES (adapt from your fit-workout-service.ts) ---
const WORKOUT_STEP_TYPES = {
  WARMUP: { intensity: 'warmup', duration_type: 'distance', target_type: 'pace', step_name: 'Warm-up' },
  COOLDOWN: { intensity: 'cooldown', duration_type: 'distance', target_type: 'pace', step_name: 'Cool-down' },
  
  ACTIVE_RUN: { intensity: 'active', duration_type: 'distance', target_type: 'pace', step_name: 'Run' },
  RECOVERY_RUN: { intensity: 'active', duration_type: 'distance', target_type: 'pace', step_name: 'Recovery Run' },
  RECOVERY_JOG: { intensity: 'rest', duration_type: 'time', target_type: 'open', step_name: 'Recovery Jog' }, // 'rest' intensity for FIT recovery intervals
  
  LT_INTERVAL: { intensity: 'active', duration_type: 'distance', target_type: 'pace', step_name: 'Lactate Threshold' },
  VO2_INTERVAL: { intensity: 'active', duration_type: 'distance', target_type: 'pace', step_name: 'VO2 Max Interval' },
  
  STRIDE_ACTIVE: { intensity: 'active', duration_type: 'distance', target_type: 'pace', step_name: 'Stride' },
  
  REST_DAY: { intensity: 'rest', duration_type: 'open', target_type: 'open', step_name: 'Rest' },
  CROSS_TRAINING: { intensity: 'active', duration_type: 'time', target_type: 'open', step_name: 'Cross-Training' },

  // Fallback - though direct key usage in createStep is preferred
  GENERIC_ACTIVE: { intensity: 'active', duration_type: 'open', target_type: 'open', step_name: 'Active' },
};

const MILES_TO_METERS = 1609.34;
const KM_TO_METERS = 1000;

// Define constants for pace names to ensure consistency
const PFITZ_PACE_GENERAL_AEROBIC = "GENERAL_AEROBIC_PACE";
const PFITZ_PACE_RECOVERY = "RECOVERY_PACE";
const PFITZ_PACE_LT = "LT_PACE"; // Lactate Threshold Pace (15K to HM pace)
const PFITZ_PACE_MP = "MARATHON_PACE";
const PFITZ_PACE_VO2_5K = "5K_PACE"; // VO2 Max often at 5K pace
const PFITZ_PACE_VO2_3K = "3K_PACE"; // VO2 Max can also be 3K pace
const PFITZ_PACE_10K = "10K_PACE";
const PFITZ_PACE_STRIDE = "STRIDE_PACE";
const PFITZ_PACE_LONG_RUN = "LONG_RUN_PACE";
const PFITZ_PACE_MEDIUM_LONG_RUN = "MEDIUM_LONG_RUN_PACE";

// --- Core Parsing Logic ---
/**
 * Parses a workout description string into a FitWorkoutFile object.
 * This is heuristic and will need refinement.
 * @param {string} description - e.g., "Lactate threshold {8} w {4} @ 15K to half marathon pace"
 * @param {string} planUnits - 'mi' or 'km'
 * @returns {FitWorkoutFile | null}
 */
function parseWorkoutDescriptionToFitFile(description, planUnits = 'mi') {
  const originalDescription = description;
  let normalizedDescription = description.toLowerCase();

  /** @type {FitWorkoutFile} */
  const workoutFile = {
    file_type: 'workout',
    manufacturer: 'StridrApp',
    product: 'PlanImporter',
    time_created: new Date(), // Will be updated at the end
    workout_name: originalDescription, // Default, will be refined
    sport: 'running',
    num_valid_steps: 0,
    steps: [],
    // Stridr-specific extensions for templates
    category: 'general', // Default category, will be updated
    description: `Template generated from plan description: "${originalDescription}"`,
  };

  let steps = [];
  const distanceMultiplier = planUnits === 'mi' ? MILES_TO_METERS : KM_TO_METERS;

  // Helper to create a step, refined
  const createStep = (
    typeKey, // Key from WORKOUT_STEP_TYPES
    { durationDistMiles, durationTimeMinutes, notes, targetPaceName, stepNameSuffix } = {}
  ) => {
    const baseStep = WORKOUT_STEP_TYPES[typeKey] || WORKOUT_STEP_TYPES.ACTIVE_RUN; // Fallback to ACTIVE_RUN
    /** @type {FitWorkoutStep} */
    let newStep = {
      ...baseStep,
      step_name: baseStep.step_name + (stepNameSuffix ? ` ${stepNameSuffix}` : ''),
      notes: notes || baseStep.notes || undefined,
      target_custom_value: targetPaceName || baseStep.target_custom_value || undefined,
      target_value: undefined, // Explicitly undefined, prioritize named paces for templates
    };

    if (durationDistMiles && (newStep.duration_type === 'distance' || !newStep.duration_type)) {
      newStep.duration_type = 'distance';
      newStep.duration_distance = Math.round(durationDistMiles * distanceMultiplier);
    } else if (durationTimeMinutes && (newStep.duration_type === 'time' || !newStep.duration_type)) {
      newStep.duration_type = 'time';
      newStep.duration_value = durationTimeMinutes * 60;
    } else if (newStep.duration_type === 'open') {
      // Keep as open, no specific duration value needed
    } else if (!newStep.duration_type && !durationDistMiles && !durationTimeMinutes) {
      // If no duration provided and type is not 'open', make it open by default for templates
      newStep.duration_type = 'open';
    }
    
    // Ensure target_type is set if it's pace-based but no custom pace name given
    if (newStep.target_type === 'pace' && !newStep.custom_target_value_low && !newStep.target_value) {
        // For templates, it might be better to leave target_value undefined
        // or use a very generic placeholder if no specific pace name is derived.
        // For now, let's keep it undefined if no pace name.
    }
    return newStep;
  };

  const addWarmup = (distMiles = 1.5) => {
    steps.push(createStep('WARMUP', { durationDistMiles: distMiles, targetPaceName: PFITZ_PACE_RECOVERY }));
  };

  const addCooldown = (distMiles = 1) => {
    steps.push(createStep('COOLDOWN', { durationDistMiles: distMiles, targetPaceName: PFITZ_PACE_RECOVERY }));
  };

  // --- Parsing Logic ---

  if (normalizedDescription.includes("rest or cross-training") || normalizedDescription === "rest" || normalizedDescription === "off") {
    workoutFile.workout_name = "Rest or Cross-Training";
    workoutFile.category = 'rest';
    steps.push(createStep('REST_DAY'));
  }
  // Recovery run: "Recovery {X}" or "Recovery + strides {X} w/ Y x 100m strides"
  else if (normalizedDescription.startsWith("recovery")) {
    workoutFile.category = 'recovery';
    const distMatch = normalizedDescription.match(/\{([\d.-]+)\}/);
    const distance = distMatch ? parseFloat(distMatch[1]) : 4; // Default 4 miles for recovery
    
    workoutFile.workout_name = `Recovery ${distance}${planUnits}`;
    steps.push(createStep('RECOVERY_RUN', { durationDistMiles: distance, targetPaceName: PFITZ_PACE_RECOVERY }));

    if (normalizedDescription.includes("strides")) {
      workoutFile.workout_name += " w/ Strides";
      const strideMatch = normalizedDescription.match(/(\d+)\s*x\s*100m/);
      const numStrides = strideMatch ? parseInt(strideMatch[1]) : 6;
      for (let i = 0; i < numStrides; i++) {
        steps.push(createStep('STRIDE_ACTIVE', { durationDistMiles: 100 / distanceMultiplier, targetPaceName: PFITZ_PACE_STRIDE, stepNameSuffix: `(${i+1}/${numStrides})` }));
        if (i < numStrides - 1) {
          steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: 1, notes: "Jog/walk recovery" })); // ~1 min recovery
        }
      }
    }
  }
  // General Aerobic: "General aerobic {X}" or "GA + strides {X} w/ Y x 100m strides"
  else if (normalizedDescription.startsWith("general aerobic") || normalizedDescription.startsWith("ga ")) {
    workoutFile.category = 'easy';
    const distMatch = normalizedDescription.match(/\{([\d.-]+)\}/);
    const distance = distMatch ? parseFloat(distMatch[1]) : 5; // Default distance
    
    workoutFile.workout_name = `General Aerobic ${distance}${planUnits}`;
    steps.push(createStep('ACTIVE_RUN', { durationDistMiles: distance, targetPaceName: PFITZ_PACE_GENERAL_AEROBIC }));

    if (normalizedDescription.includes("strides")) {
      workoutFile.workout_name += " w/ Strides";
      const strideMatch = normalizedDescription.match(/(\d+)\s*x\s*100m/);
      const numStrides = strideMatch ? parseInt(strideMatch[1]) : 6; // Default 6 strides
      // Add a short recovery jog before strides
      steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: 2, notes: "Easy jog before strides" }));
      for (let i = 0; i < numStrides; i++) {
        steps.push(createStep('STRIDE_ACTIVE', { durationDistMiles: 100 / distanceMultiplier, targetPaceName: PFITZ_PACE_STRIDE, stepNameSuffix: `(${i+1}/${numStrides})` }));
        if (i < numStrides - 1) {
          steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: 1, notes: "Jog/walk recovery" }));
        }
      }
    }
  }
  // Lactate Threshold: "Lactate threshold {total_dist} w {active_dist} @ 15K to HM pace"
  else if (normalizedDescription.includes("lactate threshold") || normalizedDescription.includes("lt ")) {
    workoutFile.category = 'tempo';
    const totalDistMatch = normalizedDescription.match(/\{([\d.-]+)\}/); // First {X} is total
    const activeDistMatch = normalizedDescription.match(/w\s*\{([\d.-]+)\}/); // w {Y} is active LT part

    if (totalDistMatch) {
      const totalDist = parseFloat(totalDistMatch[1]);
      const activeDist = activeDistMatch ? parseFloat(activeDistMatch[1]) : Math.max(3, totalDist / 2 - 2); // Estimate active if not specified

      workoutFile.workout_name = `Lactate Threshold ${totalDist}${planUnits} (${activeDist}${planUnits} @ LT)`;
      
      const wuCdDistEach = Math.max(1, (totalDist - activeDist) / 2);
      addWarmup(wuCdDistEach);
      steps.push(createStep('LT_INTERVAL', { durationDistMiles: activeDist, targetPaceName: PFITZ_PACE_LT }));
      addCooldown(wuCdDistEach);

    } else { // Simpler LT, e.g. "LT run 30 minutes"
        workoutFile.workout_name = `Lactate Threshold Run`;
        addWarmup();
        steps.push(createStep('LT_INTERVAL', { durationTimeMinutes: 20, targetPaceName: PFITZ_PACE_LT, notes: "Main LT segment" })); // Default 20 min LT
        addCooldown();
    }
  }
  // VO2 Max: e.g., "VO2max {total_dist} w/ 5 x 600m @ 5K pace w/ equal time recovery jogs"
  // Or "VO2max {total_dist} w/ 5 x 1000m @ 5K pace w/ 600-800m recovery jogs"
  else if (normalizedDescription.includes("vo2max") || normalizedDescription.includes("vo2 max")) {
    workoutFile.category = 'interval';
    const totalDistMatch = normalizedDescription.match(/\{([\d.-]+)\}/);
    const intervalMatch = normalizedDescription.match(/(\d+)\s*x\s*([\d]+)m\s*@\s*([\w\s-]+pace)/);
    // recovery: "w/ equal time recovery jogs" or "w/ 600-800m recovery jogs" or "w/ 2-3 min rec"

    if (intervalMatch && totalDistMatch) {
      const totalDist = parseFloat(totalDistMatch[1]);
      const numReps = parseInt(intervalMatch[1]);
      const repDistMeters = parseInt(intervalMatch[2]);
      const repPaceText = intervalMatch[3].trim();
      let repPaceCat = PFITZ_PACE_VO2_5K; // Default
      if (repPaceText.includes("3k") || repPaceText.includes("3000m")) repPaceCat = PFITZ_PACE_VO2_3K;
      else if (repPaceText.includes("5k") || repPaceText.includes("5000m")) repPaceCat = PFITZ_PACE_VO2_5K;
      else if (repPaceText.includes("10k")) repPaceCat = PFITZ_PACE_10K;


      workoutFile.workout_name = `VO2 Max ${totalDist}${planUnits} (${numReps}x${repDistMeters}m @ ${repPaceText})`;
      
      // Estimate WU/CD distance
      const totalIntervalDistMeters = numReps * repDistMeters; // Approx, not counting recovery yet
      const wuCdDistMiles = Math.max(1.5, (totalDist - (totalIntervalDistMeters / distanceMultiplier)) / 2);
      
      addWarmup(wuCdDistMiles);

      for (let i = 0; i < numReps; i++) {
        steps.push(createStep('VO2_INTERVAL', { durationDistMiles: repDistMeters / distanceMultiplier, targetPaceName: repPaceCat, stepNameSuffix: `(${i+1}/${numReps})` }));
        if (i < numReps - 1) {
          let recoveryNotes = "Recovery jog";
          let recoveryDurationMinutes;
          let recoveryDistanceMiles;

          if (normalizedDescription.includes("equal time recovery")) {
            // Estimate recovery time based on rep pace (complex, placeholder for now)
            // For 600m @ 5k pace (e.g. ~2:00-2:30), recovery is ~2-2.5 min
            recoveryDurationMinutes = (repDistMeters <= 600) ? 2 : (repDistMeters <= 1000) ? 3 : 4;
            recoveryNotes = `Equal time recovery jog (~${recoveryDurationMinutes} min)`;
          } else {
            const recDistMatch = normalizedDescription.match(/w\/\s*([\d]+)-?([\d]+)?m\s*recovery/); // e.g. 600-800m or 400m
            const recTimeMatch = normalizedDescription.match(/w\/\s*([\d]+)-?([\d]+)?\s*min\s*rec/); // e.g. 2-3 min rec

            if (recDistMatch) {
              recoveryDistanceMiles = (parseFloat(recDistMatch[1]) + (parseFloat(recDistMatch[2] || recDistMatch[1]))) / 2 / distanceMultiplier;
              recoveryNotes = `Recovery jog ${recDistMatch[0].match(/([\d]+-?[\d]+m)/)[1]}`;
            } else if (recTimeMatch) {
              recoveryDurationMinutes = (parseFloat(recTimeMatch[1]) + (parseFloat(recTimeMatch[2] || recTimeMatch[1]))) / 2;
              recoveryNotes = `Recovery jog ${recTimeMatch[0].match(/([\d]+-?[\d]+\s*min)/)[1]}`;
            } else { // Default recovery
              recoveryDurationMinutes = 2.5;
            }
          }
          steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: recoveryDurationMinutes, durationDistMiles: recoveryDistanceMiles, notes: recoveryNotes }));
        }
      }
      addCooldown(wuCdDistMiles);
    } else {
        workoutFile.workout_name = `VO2 Max Intervals (generic)`;
        addWarmup();
        // Add a generic set of intervals if specific parsing failed
        for (let i = 0; i < 5; i++) { // Default 5 reps
            steps.push(createStep('VO2_INTERVAL', { durationDistMiles: 800 / distanceMultiplier, targetPaceName: PFITZ_PACE_VO2_5K, stepNameSuffix: `(${i+1}/5)` }));
            if (i < 4) steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: 3, notes: "Recovery jog" }));
        }
        addCooldown();
    }
  }
  // Marathon Pace: "Marathon pace {total_dist} w {mp_dist} @ MP"
  else if (normalizedDescription.includes("marathon pace") || normalizedDescription.includes("mp run")) {
    workoutFile.category = 'marathon_specific';
    const totalDistMatch = normalizedDescription.match(/\{([\d.-]+)\}/);
    const mpDistMatch = normalizedDescription.match(/w\s*\{([\d.-]+)\}/);

    if (totalDistMatch && mpDistMatch) {
      const totalDist = parseFloat(totalDistMatch[1]);
      const mpDist = parseFloat(mpDistMatch[1]);
      workoutFile.workout_name = `Marathon Pace ${totalDist}${planUnits} (${mpDist}${planUnits} @ MP)`;

      const easyDistEach = Math.max(1, (totalDist - mpDist) / 2);
      if (easyDistEach > 0) steps.push(createStep('ACTIVE_RUN', { durationDistMiles: easyDistEach, targetPaceName: PFITZ_PACE_GENERAL_AEROBIC, notes: "Warm-up portion" }));
      steps.push(createStep('ACTIVE_RUN', { durationDistMiles: mpDist, targetPaceName: PFITZ_PACE_MP, notes: "Marathon Pace segment" }));
      if (easyDistEach > 0) steps.push(createStep('ACTIVE_RUN', { durationDistMiles: easyDistEach, targetPaceName: PFITZ_PACE_RECOVERY, notes: "Cool-down portion" }));
    } else if (totalDistMatch) { // E.g. "{10} @ MP"
        const totalDist = parseFloat(totalDistMatch[1]);
        workoutFile.workout_name = `Marathon Pace ${totalDist}${planUnits}`;
        // Assume some WU/CD if it's a pure MP run
        addWarmup(1);
        steps.push(createStep('ACTIVE_RUN', { durationDistMiles: totalDist - 2 > 0 ? totalDist -2 : totalDist, targetPaceName: PFITZ_PACE_MP }));
        addCooldown(1);
    } else {
        workoutFile.workout_name = `Marathon Pace Run (generic)`;
        addWarmup();
        steps.push(createStep('ACTIVE_RUN', { durationDistMiles: 8, targetPaceName: PFITZ_PACE_MP })); // Default 8 miles MP
        addCooldown();
    }
  }
  // Medium-Long Run: "Medium-long run {X}"
  else if (normalizedDescription.startsWith("medium-long run") || normalizedDescription.startsWith("mlr")) {
    workoutFile.category = 'long';
    const distMatch = normalizedDescription.match(/\{([\d.-]+)\}/);
    const distance = distMatch ? parseFloat(distMatch[1]) : 10; // Default
    workoutFile.workout_name = `Medium-Long Run ${distance}${planUnits}`;
    steps.push(createStep('ACTIVE_RUN', { durationDistMiles: distance, targetPaceName: PFITZ_PACE_MEDIUM_LONG_RUN }));
  }
  // Long Run: "Long run {X}"
  else if (normalizedDescription.startsWith("long run")) {
    workoutFile.category = 'long';
    const distMatch = normalizedDescription.match(/\{([\d.-]+)\}/);
    const distance = distMatch ? parseFloat(distMatch[1]) : 12; // Default
    workoutFile.workout_name = `Long Run ${distance}${planUnits}`;
    steps.push(createStep('ACTIVE_RUN', { durationDistMiles: distance, targetPaceName: PFITZ_PACE_LONG_RUN }));
     if (normalizedDescription.includes("strides")) { // Sometimes strides are at the end of LR
      workoutFile.workout_name += " w/ Strides";
      const strideMatch = normalizedDescription.match(/(\d+)\s*x\s*100m/);
      const numStrides = strideMatch ? parseInt(strideMatch[1]) : 4;
      steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: 5, notes: "Easy jog before strides" }));
      for (let i = 0; i < numStrides; i++) {
        steps.push(createStep('STRIDE_ACTIVE', { durationDistMiles: 100 / distanceMultiplier, targetPaceName: PFITZ_PACE_STRIDE, stepNameSuffix: `(${i+1}/${numStrides})` }));
        if (i < numStrides - 1) {
          steps.push(createStep('RECOVERY_JOG', { durationTimeMinutes: 1, notes: "Jog/walk recovery" }));
        }
      }
    }
  }
  // Tune-up Race: "Tune-up race {8-10}k" or "{5}k race"
  else if (normalizedDescription.includes("tune-up race") || normalizedDescription.match(/\{\d+-?\d*\}k race/)) {
    workoutFile.category = 'race';
    let raceDistText = "Tune-up";
    const raceDistMatch = normalizedDescription.match(/\{([\d-]+)\}\s*k/);
    if (raceDistMatch) raceDistText = `${raceDistMatch[1]}k`;
    
    workoutFile.workout_name = `Tune-up Race: ${raceDistText}`;
    addWarmup(2); // Standard race WU
    steps.push(createStep('ACTIVE_RUN', {
      duration_type: 'open', // Race distance can vary
      targetPaceName: PFITZ_PACE_10K, // Placeholder, actual race pace varies
      notes: `Race: ${raceDistText}. Actual distance and pace determined on race day.`
    }));
    addCooldown(1.5);
  }
  // Fallback for unparsed descriptions
  else {
    console.warn(`Could not fully parse Pfitzinger description: "${originalDescription}". Creating a generic workout.`);
    workoutFile.workout_name = `General Run: ${originalDescription}`; // More specific than "Generic"
    workoutFile.category = 'general';
    // Try to extract a simple distance if possible
    const distMatch = originalDescription.match(/([\d.-]+)\s*(miles|mi|km)/i) || originalDescription.match(/\{([\d.-]+)\}/);
    if (distMatch) {
        const dist = parseFloat(distMatch[1]);
        const unit = (distMatch[2] || planUnits).toLowerCase();
        const distInMiles = (unit === 'km') ? dist / (MILES_TO_METERS/KM_TO_METERS) : dist;
        steps.push(createStep('ACTIVE_RUN', { durationDistMiles: distInMiles, targetPaceName: PFITZ_PACE_GENERAL_AEROBIC, notes: originalDescription }));
    } else {
        steps.push(createStep('ACTIVE_RUN', { duration_type: 'open', notes: originalDescription }));
    }
  }


  if (steps.length === 0) {
    // This should ideally not be reached if the else block above creates a generic step
    console.warn(`No steps created for: "${originalDescription}". Creating a single open step.`);
    steps.push({
        step_name: originalDescription,
        intensity: 'active',
        duration_type: 'open',
        target_type: 'open',
        notes: "Generic workout, please define steps based on description."
    });
    workoutFile.workout_name = `Generic: ${originalDescription}`;
  }

  workoutFile.steps = steps.map((s, i) => ({ ...s, step_index: i }));
  workoutFile.num_valid_steps = workoutFile.steps.length;
  workoutFile.time_created = new Date(); // Ensure time_created is set at the very end

  return workoutFile;
}

/**
 * Saves a FitWorkoutFile to Supabase.
 * @param {FitWorkoutFile} workoutFile
 */
async function saveWorkoutTemplateToSupabase(workoutFile) {
  try {
    // 1. Upsert into structured_workouts
    const { data: structuredWorkout, error: swError } = await supabase
      .from('structured_workouts')
      .upsert({
        name: workoutFile.workout_name, // Using name as the conflict target for upsert
        description: workoutFile.description || `Generated template: ${workoutFile.workout_name}`,
        category: workoutFile.category || 'general',
        created_by: DEFAULT_USER_ID, // Assign to a default admin or null
      }, {
        onConflict: 'name', // Assumes 'name' is unique. Adjust if using ID.
        // ignoreDuplicates: false // Set to true if you only want to insert if name doesn't exist
      })
      .select()
      .single();

    if (swError) {
        // If it's a unique constraint violation that upsert didn't handle (e.g. if not using onConflict: 'name')
        if (swError.code === '23505') { // Unique violation
            console.warn(`Template named "${workoutFile.workout_name}" likely already exists. Skipping insert. Error: ${swError.message}`);
            // Optionally, fetch existing ID to update steps if needed
            const {data: existing, error: fetchError} = await supabase.from('structured_workouts').select('id').eq('name', workoutFile.workout_name).single();
            if (fetchError || !existing) {
                console.error(`Failed to fetch existing template by name ${workoutFile.workout_name} after upsert issue.`);
                return;
            }
            // If you want to update steps for existing template:
            // await supabase.from('structured_workout_steps').delete().eq('structured_workout_id', existing.id);
            // structuredWorkoutId = existing.id;
            // Then proceed to insert steps. For now, we just log and skip.
            return; // Skip step insertion if main workout insert/upsert failed or was skipped
        }
        throw swError;
    }
    if (!structuredWorkout) throw new Error('Failed to create or retrieve structured workout entry.');

    const structuredWorkoutId = structuredWorkout.id;

    // Delete existing steps for this template before inserting new ones to ensure clean update
    const { error: deleteError } = await supabase
        .from('structured_workout_steps')
        .delete()
        .eq('structured_workout_id', structuredWorkoutId);

    if (deleteError) {
        console.error(`Error deleting old steps for ${workoutFile.workout_name}:`, deleteError);
        // Decide if you want to proceed or stop
    }

    // 2. Insert into structured_workout_steps
    if (workoutFile.steps && workoutFile.steps.length > 0) {
      const stepsToInsert = workoutFile.steps.map((step, index) => ({
        structured_workout_id: structuredWorkoutId,
        step_order: index, // Ensure step_order is 0-indexed
        step_name: step.step_name || `Step ${index + 1}`,
        intensity: step.intensity,
        duration_type: step.duration_type,
        duration_value: step.duration_value || null,
        duration_distance: step.duration_distance || null,
        target_type: step.target_type || null,
        target_value: step.target_value || null,
        target_low: step.target_low || null,
        target_high: step.target_high || null,
        target_custom_value: step.target_custom_value || null,
        repeat_steps: step.repeat_steps || null,
        // repeat_type: step.repeat_type || null, // Add if in your DB schema
        notes: step.notes || null,
      }));

      const { error: stepsError } = await supabase
        .from('structured_workout_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;
    }
    console.log(`Successfully saved/updated template: "${workoutFile.workout_name}" (ID: ${structuredWorkoutId})`);

  } catch (error) {
    console.error(`Error saving template "${workoutFile.workout_name}" to Supabase:`, error.message);
  }
}


// --- Main Script Execution ---
async function main() {
  console.log("Starting script to import plan descriptions as workout templates...");
  const allWorkoutDescriptions = new Set();
  let planFiles = [];

  function findJsonFiles(dir) {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        findJsonFiles(filePath); // Recurse into subdirectories
      } else if (path.extname(file) === '.json') {
        planFiles.push(filePath);
      }
    });
  }

  findJsonFiles(PLANS_DIRECTORY);
  console.log(`Found ${planFiles.length} plan files to process.`);

  for (const filePath of planFiles) {
    try {
      const planJsonString = fs.readFileSync(filePath, 'utf-8');
      const planJson = JSON.parse(planJsonString);
      console.log(`\nProcessing plan: ${planJson.name || path.basename(filePath)} (Units: ${planJson.units || 'mi'})`);
      
      const planUnits = planJson.units || 'mi'; // Default to miles if not specified

      if (planJson.schedule && Array.isArray(planJson.schedule)) {
        planJson.schedule.forEach(weekObject => { // weekObject is an item from the schedule array
          // Each weekObject should have a "workouts" array based on pfitz_18_55.json
          if (weekObject && Array.isArray(weekObject.workouts)) {
            weekObject.workouts.forEach(workoutEntry => {
              let descriptionToAdd = null;

              // The workoutEntry itself should be an object with a "title" property
              if (workoutEntry && typeof workoutEntry.title === 'string' && workoutEntry.title.trim() !== "") {
                descriptionToAdd = workoutEntry.title.trim();
              }
              // Fallback for older/different structures if a dayWorkout is just a string (less likely for these files)
              else if (typeof workoutEntry === 'string' && workoutEntry.trim() !== "") {
                descriptionToAdd = workoutEntry.trim();
              }

              if (descriptionToAdd && descriptionToAdd.toLowerCase() !== "rest" && descriptionToAdd.toLowerCase() !== "off") {
                allWorkoutDescriptions.add(JSON.stringify({ title: descriptionToAdd, units: planUnits }));
              }
            });
          }
        });
      }
    } catch (e) {
      console.error(`Error processing file ${filePath}:`, e.message);
    }
  }

  console.log(`\nFound ${allWorkoutDescriptions.size} unique workout descriptions to process into templates.`);
  let count = 0;
  for (const descJsonString of allWorkoutDescriptions) {
    count++;
    const { title, units } = JSON.parse(descJsonString);
    console.log(`\n(${count}/${allWorkoutDescriptions.size}) Parsing: "${title}" (Units: ${units})`);
    const workoutFile = parseWorkoutDescriptionToFitFile(title, units);
    if (workoutFile) {
      await saveWorkoutTemplateToSupabase(workoutFile);
    }
  }

  console.log("\nScript finished importing templates.");
}

main().catch(console.error);