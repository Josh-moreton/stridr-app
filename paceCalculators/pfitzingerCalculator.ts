/**
 * Pfitzinger/Douglas Pace Calculator
 *
 * Based on the Advanced Marathoning by Pete Pfitzinger & Scott Douglas.
 * Uses precise lactate threshold and VO2max zones with scientific backing.
 */

import { Units } from "../../@types/app";
import {
  BasePaceCalculator,
  RaceTime,
  PaceZones,
  PaceZoneLabels,
} from "./baseCalculator";

export class PfitzingerPaceCalculator extends BasePaceCalculator {
  name = "Pfitzinger/Douglas";
  description =
    "Scientific training zones based on Advanced Marathoning methodology";
  supportedDistances = ["5K", "10K", "15K", "10M", "half", "marathon"];

  zoneLabels: PaceZoneLabels = {
    easy: "General Aerobic (GA)",
    marathon: "Marathon Pace (MP)",
    threshold: "Lactate Threshold (LT)",
    interval: "VO₂max",
    recovery: "Recovery",
    long: "Long Run (LR)",
  };

  calculatePaces(raceTime: RaceTime, units: Units): PaceZones {
    const baseUnits: Units = "km";

    // Use raceTime to calculate paces dynamically
    const timeInSeconds = raceTime.timeInSeconds;

    // Map race distances to kilometers
    let distanceInKm: number;
    switch (raceTime.distance) {
      case "5K":
        distanceInKm = 5;
        break;
      case "10K":
        distanceInKm = 10;
        break;
      case "15K":
        distanceInKm = 15;
        break;
      case "10M":
        distanceInKm = 16.09;
        break;
      case "half":
        distanceInKm = 21.1;
        break;
      case "marathon":
        distanceInKm = 42.2;
        break;
      default:
        distanceInKm = 5; // Default to 5K
    }

    // Calculate race pace per kilometer in seconds
    const racePacePerKm = timeInSeconds / distanceInKm;

    // Estimate different race paces based on current race time
    // Using VDOT-based pace relationships from Pfitzinger
    let fiveKPace: number;
    let marathonRacePace: number;

    if (raceTime.distance === "5K") {
      fiveKPace = racePacePerKm;
      marathonRacePace = racePacePerKm * 1.2; // Marathon ~20% slower than 5K
    } else if (raceTime.distance === "marathon") {
      marathonRacePace = racePacePerKm;
      fiveKPace = racePacePerKm * 0.83; // 5K ~17% faster than marathon
    } else {
      // For other distances, estimate both
      const adjustmentFactor = this.getAdjustmentFactor(raceTime.distance);
      fiveKPace = racePacePerKm * adjustmentFactor.toFiveK;
      marathonRacePace = racePacePerKm * adjustmentFactor.toMarathon;
    }

    // Debug logging to check calculations
    console.log(
      `Race pace per km: ${racePacePerKm} seconds (${Math.floor(racePacePerKm / 60)}:${String(Math.round(racePacePerKm % 60)).padStart(2, "0")})`
    );
    console.log(
      `5K pace: ${fiveKPace} seconds (${Math.floor(fiveKPace / 60)}:${String(Math.round(fiveKPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Marathon race pace: ${marathonRacePace} seconds (${Math.floor(marathonRacePace / 60)}:${String(Math.round(marathonRacePace % 60)).padStart(2, "0")})`
    );

    // Calculate raw training paces before conversion
    const rawRecoveryPace = marathonRacePace * 1.2;
    const rawEasyPace = marathonRacePace * 1.1;
    const rawLongPace = marathonRacePace * 1.15; // Long runs: 15% slower than marathon pace
    const rawMarathonPace = marathonRacePace;
    const rawThresholdPace = fiveKPace * 1.08;
    const rawIntervalPace = fiveKPace * 0.98; // VO2max intervals: 2% faster than 5K pace

    console.log(
      `Raw Recovery: ${rawRecoveryPace} seconds (${Math.floor(rawRecoveryPace / 60)}:${String(Math.round(rawRecoveryPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Raw Easy: ${rawEasyPace} seconds (${Math.floor(rawEasyPace / 60)}:${String(Math.round(rawEasyPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Raw Long: ${rawLongPace} seconds (${Math.floor(rawLongPace / 60)}:${String(Math.round(rawLongPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Raw Marathon: ${rawMarathonPace} seconds (${Math.floor(rawMarathonPace / 60)}:${String(Math.round(rawMarathonPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Raw Threshold: ${rawThresholdPace} seconds (${Math.floor(rawThresholdPace / 60)}:${String(Math.round(rawThresholdPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Raw Interval: ${rawIntervalPace} seconds (${Math.floor(rawIntervalPace / 60)}:${String(Math.round(rawIntervalPace % 60)).padStart(2, "0")})`
    );

    // Pfitzinger training zones based on proper methodology

    const recoveryPace = this.convertPaceUnits(
      rawRecoveryPace,
      baseUnits,
      units
    );

    const easyPace = this.convertPaceUnits(rawEasyPace, baseUnits, units);

    const longPace = this.convertPaceUnits(rawLongPace, baseUnits, units);

    const marathonPace = this.convertPaceUnits(
      rawMarathonPace,
      baseUnits,
      units
    );

    const thresholdPace = this.convertPaceUnits(
      rawThresholdPace,
      baseUnits,
      units
    );
    console.log(
      `Threshold conversion: ${rawThresholdPace} -> ${thresholdPace}`
    );

    const intervalPace = this.convertPaceUnits(
      rawIntervalPace,
      baseUnits,
      units
    );

    // Debug the final converted paces
    console.log(
      `Recovery: ${recoveryPace} seconds (${Math.floor(recoveryPace / 60)}:${String(Math.round(recoveryPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Easy: ${easyPace} seconds (${Math.floor(easyPace / 60)}:${String(Math.round(easyPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Long: ${longPace} seconds (${Math.floor(longPace / 60)}:${String(Math.round(longPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Marathon: ${marathonPace} seconds (${Math.floor(marathonPace / 60)}:${String(Math.round(marathonPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Threshold: ${thresholdPace} seconds (${Math.floor(thresholdPace / 60)}:${String(Math.round(thresholdPace % 60)).padStart(2, "0")})`
    );
    console.log(
      `Interval: ${intervalPace} seconds (${Math.floor(intervalPace / 60)}:${String(Math.round(intervalPace % 60)).padStart(2, "0")})`
    );

    return {
      easy: easyPace, // General aerobic runs
      marathon: marathonPace, // Marathon pace runs
      threshold: thresholdPace, // Lactate threshold runs
      interval: intervalPace, // VO₂max intervals
      recovery: recoveryPace, // Recovery runs (using recovery pace)
      long: longPace, // Long runs
    };
  }

  private getAdjustmentFactor(distance: string): {
    toFiveK: number;
    toMarathon: number;
  } {
    switch (distance) {
      case "10K":
        return { toFiveK: 0.95, toMarathon: 1.14 };
      case "15K":
        return { toFiveK: 0.92, toMarathon: 1.1 };
      case "10M":
        return { toFiveK: 0.9, toMarathon: 1.08 };
      case "half":
        return { toFiveK: 0.87, toMarathon: 1.04 };
      default:
        return { toFiveK: 1, toMarathon: 1.2 };
    }
  }
}
