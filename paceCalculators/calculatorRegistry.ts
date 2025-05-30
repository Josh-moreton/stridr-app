/**
 * Calculator Registry - Maps training plan providers to their specific pace calculators
 */

import { PaceCalculator } from "./baseCalculator";
import { PfitzingerPaceCalculator } from "./pfitzingerCalculator";
import { HansonsPaceCalculator } from "./hansonsCalculator";
import { HigdonPaceCalculator } from "./higdonCalculator";
import { DanielsPaceCalculator } from "./danielsCalculator";

// Initialize all calculators
const pfitzingerCalculator = new PfitzingerPaceCalculator();
const hansonsCalculator = new HansonsPaceCalculator();
const higdonCalculator = new HigdonPaceCalculator();
const danielsCalculator = new DanielsPaceCalculator();

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
  hansons: hansonsCalculator,
  higdon: higdonCalculator,
  boston: danielsCalculator, // Boston plans use scientific approach
  coogan: danielsCalculator, // Coogan uses scientific approach
  c25k: higdonCalculator, // C25K uses simple approach
  test: danielsCalculator, // Test plans use default scientific approach
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

  // Default to Daniels calculator for unrecognized plans
  return danielsCalculator;
}

/**
 * Get all available pace calculators
 */
export function getAllPaceCalculators(): PaceCalculator[] {
  return [
    danielsCalculator,
    pfitzingerCalculator,
    hansonsCalculator,
    higdonCalculator,
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
  HansonsPaceCalculator,
  HigdonPaceCalculator,
  DanielsPaceCalculator,
};
