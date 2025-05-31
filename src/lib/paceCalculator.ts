export interface RecentPerformanceInput {
  recentRaceDistance: string; // '1 mile', '5k', '10k', 'Half Marathon', 'Marathon', or 'Custom'
  recentRaceTime: string; // MM:SS or HH:MM:SS
  customRaceDistanceValue?: string; // e.g., '25' if recentRaceDistance is 'Custom'
  customRaceDistanceUnits?: 'km' | 'miles'; // Units for custom distance
}

export interface TrainingPaces {
  easyPace: { minPerKm: number; maxPerKm: number; minPerMile: number; maxPerMile: number };
  tempoPace: { minPerKm: number; maxPerKm: number; minPerMile: number; maxPerMile: number };
  intervalPace: { minPerKm: number; maxPerKm: number; minPerMile: number; maxPerMile: number }; // This might be further broken down by interval type (e.g., VO2max, Threshold)
  longRunPace: { minPerKm: number; maxPerKm: number; minPerMile: number; maxPerMile: number };
  vdot?: number; // Optional: to store the calculated VDOT score
}

const METERS_IN_KM = 1000;
const METERS_IN_MILE = 1609.34;
const KM_PER_MILE = METERS_IN_MILE / METERS_IN_KM; // Approx 1.60934

export const COMMON_RACE_DISTANCES_METERS: { [key: string]: number } = {
  '1 mile': METERS_IN_MILE,
  '5k': 5 * METERS_IN_KM,
  '10k': 10 * METERS_IN_KM,
  'Half Marathon': 21.0975 * METERS_IN_KM, // 21.0975 km
  'Marathon': 42.195 * METERS_IN_KM,    // 42.195 km
};

/**
 * Parses a time string (MM:SS or HH:MM:SS) into total seconds.
 * @param timeString The time string to parse.
 * @returns Total seconds, or NaN if parsing fails.
 */
export const parseTimeToSeconds = (timeString: string): number => {
  if (!timeString) return NaN;
  const parts = timeString.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;

  if (parts.length === 2) { // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) { // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return NaN; // Invalid format
};

/**
 * Converts a distance string (standard or custom) into meters.
 * @param distanceKey Key from COMMON_RACE_DISTANCES_METERS or 'Custom'.
 * @param customDistanceValue Value for custom distance (if distanceKey is 'Custom').
 * @param customDistanceUnits Units for custom distance ('km' or 'miles').
 * @returns Distance in meters, or NaN if conversion fails.
 */
export const getDistanceInMeters = (
  distanceKey: string,
  customDistanceValue?: string,
  customDistanceUnits?: 'km' | 'miles'
): number => {
  if (distanceKey === 'Custom') {
    const value = parseFloat(customDistanceValue || '');
    if (isNaN(value) || value <= 0) return NaN;
    if (customDistanceUnits === 'km') {
      return value * METERS_IN_KM;
    } else if (customDistanceUnits === 'miles') {
      return value * METERS_IN_MILE;
    }
    return NaN; // Invalid units for custom distance
  } else if (COMMON_RACE_DISTANCES_METERS[distanceKey]) {
    return COMMON_RACE_DISTANCES_METERS[distanceKey];
  }
  return NaN; // Unknown distance key
};


// Actual VDOT calculation based on Jack Daniels' formulas.
const calculateVDOT = (distanceMeters: number, timeSeconds: number): number => {
  if (distanceMeters <= 0 || timeSeconds <= 0) return NaN;

  const timeMinutes = timeSeconds / 60;
  const velocityMetersPerMinute = distanceMeters / timeMinutes;

  if (timeMinutes === 0) return NaN; // Avoid division by zero

  // Calculate VO2 required for the performance
  const vo2Raw = -4.60 + (0.182258 * velocityMetersPerMinute) + (0.000104 * Math.pow(velocityMetersPerMinute, 2));

  // Calculate the percentage of VO2max utilized during the race
  const percentMaxVo2 = 0.8 + (0.1894393 * Math.exp(-0.012778 * timeMinutes)) + (0.2989558 * Math.exp(-0.1932605 * timeMinutes));

  if (percentMaxVo2 === 0) return NaN; // Avoid division by zero

  const vdot = vo2Raw / percentMaxVo2;
  
  return vdot > 0 ? vdot : NaN; // Ensure VDOT is positive
};

/**
 * Calculates training paces based on recent performance using VDOT.
 * This uses the VDOT value to derive pace ranges for different training intensities.
 * @param performance User's recent race performance.
 * @returns Calculated training paces.
 */
export const calculateTrainingPaces = (performance: RecentPerformanceInput): TrainingPaces | null => {
  const timeSeconds = parseTimeToSeconds(performance.recentRaceTime);
  const distanceMeters = getDistanceInMeters(
    performance.recentRaceDistance,
    performance.customRaceDistanceValue,
    performance.customRaceDistanceUnits
  );

  if (isNaN(timeSeconds) || isNaN(distanceMeters)) {
    console.error("Invalid time or distance for pace calculation.", performance);
    return null;
  }

  const vdot = calculateVDOT(distanceMeters, timeSeconds);

  if (isNaN(vdot) || vdot <= 0) {
    console.error("Invalid VDOT calculated.", vdot);
    return null;
  }

  // Calculate velocity (m/s) at 100% VDOT intensity
  // Formula: speed_m_s = (0.00000223 * vdot^2) + (0.0034766 * vdot) + 0.09553
  const vAt100PercentVdotMs = (0.00000223 * vdot * vdot) + (0.0034766 * vdot) + 0.09553;

  if (vAt100PercentVdotMs <= 0) {
    console.error("Invalid velocity at 100% VDOT.");
    return null;
  }

  const baseIntervalPaceSecPerKm = 1000 / vAt100PercentVdotMs;

  // Define speed percentages for different training zones (minSpeed, maxSpeed)
  const intervalSpeedPercents = { min: 0.97, max: 1.00 }; // 97-100% of vVO2max speed
  const tempoSpeedPercents = { min: 0.86, max: 0.88 };    // 86-88% of vVO2max speed
  const easyLongSpeedPercents = { min: 0.60, max: 0.75 }; // 60-75% of vVO2max speed

  const calculatePaceRange = (basePaceSecPerKm: number, speedPercents: {min: number, max: number}) => {
    // minPace (faster) corresponds to maxSpeedPercent
    // maxPace (slower) corresponds to minSpeedPercent
    const minPerKm = basePaceSecPerKm / speedPercents.max;
    const maxPerKm = basePaceSecPerKm / speedPercents.min;
    return {
      minPerKm,
      maxPerKm,
      minPerMile: minPerKm * KM_PER_MILE,
      maxPerMile: maxPerKm * KM_PER_MILE,
    };
  };

  return {
    easyPace: calculatePaceRange(baseIntervalPaceSecPerKm, easyLongSpeedPercents),
    tempoPace: calculatePaceRange(baseIntervalPaceSecPerKm, tempoSpeedPercents),
    intervalPace: calculatePaceRange(baseIntervalPaceSecPerKm, intervalSpeedPercents),
    longRunPace: calculatePaceRange(baseIntervalPaceSecPerKm, easyLongSpeedPercents), // Same as Easy for now
    vdot: parseFloat(vdot.toFixed(1)), // Store VDOT with one decimal place
  };
};

// Example usage (can be removed or used for testing):
/*
const examplePerformance: RecentPerformanceInput = {
  recentRaceDistance: '5k',
  recentRaceTime: '25:00',
};
const paces = calculateTrainingPaces(examplePerformance);
console.log('Calculated Paces:', paces);

const exampleCustomPerformance: RecentPerformanceInput = {
  recentRaceDistance: 'Custom',
  customRaceDistanceValue: '10',
  customRaceDistanceUnits: 'miles',
  recentRaceTime: '01:10:00',
};
const customPaces = calculateTrainingPaces(exampleCustomPerformance);
console.log('Calculated Custom Paces:', customPaces);
*/
