/**
 * Calculator Registry - Maps training plan providers to their specific pace calculators
 */

import { PaceCalculator } from "./baseCalculator";
import { PfitzingerPaceCalculator } from "./pfitzingerCalculator";
// TODO: Import other calculators when they are implemented
// import { HansonsPaceCalculator } from "./hansonsCalculator";
// import { HigdonPaceCalculator } from "./higdonCalculator";
// import { DanielsPaceCalculator } from "./danielsCalculator";

// Initialize all calculators
const pfitzingerCalculator = new PfitzingerPaceCalculator();
// TODO: Initialize other calculators when they are implemented
// const hansonsCalculator = new HansonsPaceCalculator();
// const higdonCalculator = new HigdonPaceCalculator();
// const danielsCalculator = new DanielsPaceCalculator();

// Provider patterns to match plan IDs
const PROVIDER_PATTERNS = {
  pfitzinger: /^(pfitz_|frr_)/i,
  hansons: /^hansons_/i,
  higdon: /^higdon_/i,
  boston: /^boston_/i,
  coogan: /^coogan_/i,
  c25k: /^c25k/i,
  test: /^test_/i,
} as const;

type ProviderKey = keyof typeof PROVIDER_PATTERNS;

// Map providers to calculators
const PROVIDER_CALCULATORS: Record<ProviderKey, PaceCalculator> = {
  pfitzinger: pfitzingerCalculator,
  hansons: pfitzingerCalculator, // TODO: Use HansonsPaceCalculator when implemented
  higdon: pfitzingerCalculator, // TODO: Use HigdonPaceCalculator when implemented
  boston: pfitzingerCalculator, // TODO: Use DanielsPaceCalculator when implemented
  coogan: pfitzingerCalculator, // TODO: Use DanielsPaceCalculator when implemented
  c25k: pfitzingerCalculator, // TODO: Use HigdonPaceCalculator when implemented
  test: pfitzingerCalculator, // TODO: Use DanielsPaceCalculator when implemented
};

/**
 * Get the appropriate pace calculator for a training plan
 */
export function getPaceCalculatorForPlan(planId: string): PaceCalculator {
  for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
    if (pattern.test(planId)) {
      return PROVIDER_CALCULATORS[provider as ProviderKey];
    }
  }

  // Default to Pfitzinger calculator for unrecognized plans
  return pfitzingerCalculator;
}

/**
 * Get all available pace calculators
 */
export function getAllPaceCalculators(): PaceCalculator[] {
  return [
    pfitzingerCalculator,
    // TODO: Add other calculators when they are implemented
    // danielsCalculator,
    // hansonsCalculator,
    // higdonCalculator,
  ];
}

/**
 * Get pace calculator by name
 */
export function getPaceCalculatorByName(name: string): PaceCalculator | null {
  const calculators = getAllPaceCalculators();
  return calculators.find(calc => calc.name === name) || null;
}

export {
  PfitzingerPaceCalculator,
  // TODO: Export other calculators when they are implemented
  // HansonsPaceCalculator,
  // HigdonPaceCalculator,
  // DanielsPaceCalculator,
};
