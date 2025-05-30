/**
 * Base pace calculator interface and common functionality
 * All provider-specific calculators extend this base
 */

import { Units } from "../../@types/app";

export interface RaceTime {
  distance: string;
  timeInSeconds: number;
}

export interface PaceZones {
  easy: number; // Easy/Recovery pace (seconds per unit)
  marathon: number; // Marathon pace (seconds per unit)
  threshold: number; // Lactate Threshold pace (seconds per unit)
  interval: number; // VO2max/5K pace (seconds per unit)
  recovery: number; // Recovery pace (seconds per unit)
  long: number; // Long run pace (seconds per unit)
}

export interface PaceZoneLabels {
  easy: string;
  marathon: string;
  threshold: string;
  interval: string;
  recovery?: string; // Optional since not all providers use all zones
  long?: string; // Optional since not all providers use all zones
}

export interface PaceCalculator {
  name: string;
  description: string;
  zoneLabels: PaceZoneLabels;
  calculatePaces(raceTime: RaceTime, units: Units): PaceZones;
  supportedDistances: string[];
}

/**
 * Base implementation with common pace calculation utilities
 */
export abstract class BasePaceCalculator implements PaceCalculator {
  abstract name: string;
  abstract description: string;
  abstract supportedDistances: string[];
  abstract zoneLabels: PaceZoneLabels;

  abstract calculatePaces(raceTime: RaceTime, units: Units): PaceZones;

  /**
   * Convert pace from per-mile to per-km or vice versa
   */
  protected convertPaceUnits(
    paceSeconds: number,
    fromUnit: Units,
    toUnit: Units
  ): number {
    if (fromUnit === toUnit) return paceSeconds;

    if (fromUnit === "km" && toUnit === "mi") {
      // Convert from per-km to per-mile (slower pace)
      return paceSeconds * 1.609344;
    } else {
      // Convert from per-mile to per-km (faster pace)
      return paceSeconds * 0.621371;
    }
  }

  /**
   * Estimate VDOT based on race performance
   */
  protected estimateVDOT(raceTime: RaceTime): number {
    const distances: { [key: string]: number } = {
      "1500m": 1500,
      mile: 1609.344,
      "5K": 5000,
      "8K": 8000,
      "10K": 10000,
      "15K": 15000,
      "10M": 16093.44,
      half: 21097.5,
      marathon: 42195,
    };

    const distanceMeters = distances[raceTime.distance];
    if (!distanceMeters) {
      throw new Error(`Unsupported distance: ${raceTime.distance}`);
    }

    const velocityMPerMin = distanceMeters / (raceTime.timeInSeconds / 60);

    // Simplified VDOT estimation
    let percentageVO2Max: number;
    if (raceTime.distance === "marathon") {
      percentageVO2Max = 79;
    } else if (raceTime.distance === "half") {
      percentageVO2Max = 85;
    } else if (raceTime.distance === "10K") {
      percentageVO2Max = 93;
    } else if (raceTime.distance === "5K") {
      percentageVO2Max = 98;
    } else {
      percentageVO2Max = 95; // default
    }

    const vdot = ((velocityMPerMin * 100) / percentageVO2Max) * 0.15;
    return Math.max(30, Math.min(85, vdot));
  }

  /**
   * Format pace as MM:SS
   */
  protected formatPace(paceInSeconds: number): string {
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.round(paceInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
