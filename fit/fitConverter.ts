import { DayDetails, PlannedWorkout, PaceZones } from "../@types/app";
import {
  FitFileData,
  FitWorkoutStep,
  FitSport,
  FitSubSport,
  FitIntensity,
  FitDurationType,
  FitTargetType,
  WorkoutConversionOptions
} from "../@types/fit";

// Utility functions for converting training plan workouts to FIT format
export class WorkoutConverter {
  constructor(_options: WorkoutConversionOptions) {
    // Store options for future use in pace/HR zone calculations
  }

  /**
   * Convert a PlannedWorkout to FIT workout data
   */
  convertPlannedWorkout(
    workout: PlannedWorkout,
    workoutName: string,
    paceZones?: PaceZones
  ): FitFileData {
    const workoutSteps = this.convertWorkoutToSteps(workout, paceZones);
    
    return {
      fileId: {
        type: 5, // Workout file type
        manufacturer: 255, // Development/Unknown
        product: 0,
        serialNumber: Date.now(),
        timeCreated: Math.floor(Date.now() / 1000)
      },
      workout: {
        wktName: workoutName || workout.title,
        sport: this.determineSport(workout),
        subSport: this.determineSubSport(workout),
        numValidSteps: workoutSteps.length
      },
      workoutSteps
    };
  }

  /**
   * Convert a DayDetails workout to FIT workout data
   */
  convertDayDetails(
    dayDetails: DayDetails,
    workoutName: string,
    paceZones?: PaceZones
  ): FitFileData {
    const workoutSteps = this.convertDayDetailsToSteps(dayDetails, paceZones);
    
    return {
      fileId: {
        type: 5,
        manufacturer: 255,
        product: 0,
        serialNumber: Date.now(),
        timeCreated: Math.floor(Date.now() / 1000)
      },
      workout: {
        wktName: workoutName || dayDetails.title,
        sport: this.determineSportFromTags(dayDetails.tags),
        numValidSteps: workoutSteps.length
      },
      workoutSteps
    };
  }

  private convertWorkoutToSteps(
    workout: PlannedWorkout,
    paceZones?: PaceZones
  ): FitWorkoutStep[] {
    const steps: FitWorkoutStep[] = [];
    
    // Parse workout description for structured intervals
    const parsedWorkout = this.parseWorkoutDescription(workout.description);
    
    if (parsedWorkout.isStructured) {
      // Convert structured workout (intervals, repeats, etc.)
      steps.push(...this.createStructuredWorkoutSteps(parsedWorkout, workout, paceZones));
    } else {
      // Simple single-step workout
      steps.push(this.createSimpleWorkoutStep(workout, 0, paceZones));
    }

    return steps;
  }

  private convertDayDetailsToSteps(
    dayDetails: DayDetails,
    paceZones?: PaceZones
  ): FitWorkoutStep[] {
    const steps: FitWorkoutStep[] = [];
    
    // Parse workout description for structured intervals
    const parsedWorkout = this.parseWorkoutDescription(dayDetails.desc);
    
    if (parsedWorkout.isStructured) {
      // Convert structured workout
      steps.push(...this.createStructuredWorkoutStepsFromDayDetails(parsedWorkout, dayDetails, paceZones));
    } else {
      // Simple workout
      steps.push(this.createSimpleWorkoutStepFromDayDetails(dayDetails, 0, paceZones));
    }

    return steps;
  }

  private parseWorkoutDescription(description: string): ParsedWorkout {
    const lowerDesc = description.toLowerCase();
    
    // Look for interval patterns
    const intervalPatterns = [
      /(\d+)\s*×\s*(\d+(?:\.\d+)?)\s*(min|km|mi|m)\s*(.*?)(?:jog|walk|rest|recovery)\s*(\d+(?:\.\d+)?)\s*(min|m|km|mi)/i,
      /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(min|km|mi|m)\s*(.*?)(?:jog|walk|rest|recovery)\s*(\d+(?:\.\d+)?)\s*(min|m|km|mi)/i,
      /(\d+)\s*repeats?\s*of\s*(\d+(?:\.\d+)?)\s*(min|km|mi|m)/i,
      /(\d+)\s*intervals?\s*of\s*(\d+(?:\.\d+)?)\s*(min|km|mi|m)/i
    ];

    for (const pattern of intervalPatterns) {
      const match = description.match(pattern);
      if (match) {
        return {
          isStructured: true,
          type: 'interval',
          repetitions: parseInt(match[1]),
          workDuration: parseFloat(match[2]),
          workUnit: match[3] as 'min' | 'km' | 'mi' | 'm',
          workIntensity: this.parseIntensityFromText(match[4] || ''),
          restDuration: match[5] ? parseFloat(match[5]) : 60, // default 1 min rest
          restUnit: match[6] as 'min' | 'km' | 'mi' | 'm' || 'min',
          originalDescription: description
        };
      }
    }

    // Look for tempo/threshold patterns
    if (lowerDesc.includes('tempo') || lowerDesc.includes('threshold') || lowerDesc.includes('lt')) {
      return {
        isStructured: true,
        type: 'tempo',
        originalDescription: description
      };
    }

    // Look for warmup/cooldown patterns
    if (lowerDesc.includes('warm') && lowerDesc.includes('cool')) {
      return {
        isStructured: true,
        type: 'warmup_main_cooldown',
        originalDescription: description
      };
    }

    return {
      isStructured: false,
      type: 'simple',
      originalDescription: description
    };
  }

  private createStructuredWorkoutSteps(
    parsed: ParsedWorkout,
    workout: PlannedWorkout,
    paceZones?: PaceZones
  ): FitWorkoutStep[] {
    const steps: FitWorkoutStep[] = [];
    let stepIndex = 0;

    switch (parsed.type) {
      case 'interval':
        // Warmup
        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Warmup',
          intensity: FitIntensity.Warmup,
          durationType: FitDurationType.Time,
          durationTime: 10 * 60, // 10 minutes
          targetType: FitTargetType.HeartRate,
          targetHrZone: 1
        });

        // Intervals
        for (let i = 0; i < parsed.repetitions!; i++) {
          // Work interval
          steps.push({
            messageIndex: stepIndex++,
            wktStepName: `Interval ${i + 1}`,
            intensity: parsed.workIntensity || FitIntensity.Interval,
            durationType: this.convertUnitToDurationType(parsed.workUnit!),
            ...(parsed.workUnit === 'min' ? 
              { durationTime: parsed.workDuration! * 60 } : 
              { durationDistance: this.convertDistanceToMeters(parsed.workDuration!, parsed.workUnit!) }
            ),
            targetType: this.getTargetTypeForPace(workout.pace),
            ...this.getTargetValuesForPace(workout.pace, paceZones)
          });

          // Recovery (except after last interval)
          if (i < parsed.repetitions! - 1) {
            steps.push({
              messageIndex: stepIndex++,
              wktStepName: 'Recovery',
              intensity: FitIntensity.Recovery,
              durationType: FitDurationType.Time,
              durationTime: parsed.restDuration! * (parsed.restUnit === 'min' ? 60 : 1),
              targetType: FitTargetType.HeartRate,
              targetHrZone: 1
            });
          }
        }

        // Cooldown
        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Cooldown',
          intensity: FitIntensity.Cooldown,
          durationType: FitDurationType.Time,
          durationTime: 10 * 60, // 10 minutes
          targetType: FitTargetType.HeartRate,
          targetHrZone: 1
        });
        break;

      case 'tempo':
      case 'warmup_main_cooldown':
        // Default structured workout with warmup, main set, cooldown
        const totalDistance = this.convertDistanceToMeters(workout.distance, workout.units);
        const warmupDistance = totalDistance * 0.2; // 20% warmup
        const cooldownDistance = totalDistance * 0.2; // 20% cooldown
        const mainDistance = totalDistance * 0.6; // 60% main

        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Warmup',
          intensity: FitIntensity.Warmup,
          durationType: FitDurationType.Distance,
          durationDistance: warmupDistance,
          targetType: FitTargetType.HeartRate,
          targetHrZone: 1
        });

        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Main Set',
          intensity: parsed.type === 'tempo' ? FitIntensity.Active : FitIntensity.Active,
          durationType: FitDurationType.Distance,
          durationDistance: mainDistance,
          targetType: this.getTargetTypeForPace(workout.pace),
          ...this.getTargetValuesForPace(workout.pace, paceZones)
        });

        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Cooldown',
          intensity: FitIntensity.Cooldown,
          durationType: FitDurationType.Distance,
          durationDistance: cooldownDistance,
          targetType: FitTargetType.HeartRate,
          targetHrZone: 1
        });
        break;

      default:
        // Fallback to simple workout
        steps.push(this.createSimpleWorkoutStep(workout, 0, paceZones));
    }

    return steps;
  }

  private createStructuredWorkoutStepsFromDayDetails(
    parsed: ParsedWorkout,
    dayDetails: DayDetails,
    paceZones?: PaceZones
  ): FitWorkoutStep[] {
    // Similar to createStructuredWorkoutSteps but using DayDetails
    const steps: FitWorkoutStep[] = [];
    let stepIndex = 0;

    switch (parsed.type) {
      case 'interval':
        // Warmup
        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Warmup',
          intensity: FitIntensity.Warmup,
          durationType: FitDurationType.Time,
          durationTime: 10 * 60,
          targetType: FitTargetType.HeartRate,
          targetHrZone: 1
        });

        // Intervals
        for (let i = 0; i < parsed.repetitions!; i++) {
          steps.push({
            messageIndex: stepIndex++,
            wktStepName: `Interval ${i + 1}`,
            intensity: parsed.workIntensity || FitIntensity.Interval,
            durationType: this.convertUnitToDurationType(parsed.workUnit!),
            ...(parsed.workUnit === 'min' ? 
              { durationTime: parsed.workDuration! * 60 } : 
              { durationDistance: this.convertDistanceToMeters(parsed.workDuration!, parsed.workUnit!) }
            ),
            targetType: this.getTargetTypeForPace(dayDetails.pace),
            ...this.getTargetValuesForPace(dayDetails.pace, paceZones)
          });

          if (i < parsed.repetitions! - 1) {
            steps.push({
              messageIndex: stepIndex++,
              wktStepName: 'Recovery',
              intensity: FitIntensity.Recovery,
              durationType: FitDurationType.Time,
              durationTime: parsed.restDuration! * (parsed.restUnit === 'min' ? 60 : 1),
              targetType: FitTargetType.HeartRate,
              targetHrZone: 1
            });
          }
        }

        // Cooldown
        steps.push({
          messageIndex: stepIndex++,
          wktStepName: 'Cooldown',
          intensity: FitIntensity.Cooldown,
          durationType: FitDurationType.Time,
          durationTime: 10 * 60,
          targetType: FitTargetType.HeartRate,
          targetHrZone: 1
        });
        break;

      default:
        steps.push(this.createSimpleWorkoutStepFromDayDetails(dayDetails, 0, paceZones));
    }

    return steps;
  }

  private createSimpleWorkoutStep(
    workout: PlannedWorkout,
    messageIndex: number,
    paceZones?: PaceZones
  ): FitWorkoutStep {
    const intensity = this.getIntensityFromTags(workout.tags) || this.getIntensityFromPace(workout.pace);
    const distanceInMeters = this.convertDistanceToMeters(workout.distance, workout.units);

    return {
      messageIndex,
      wktStepName: workout.title,
      notes: workout.description,
      intensity,
      durationType: distanceInMeters > 0 ? FitDurationType.Distance : FitDurationType.Open,
      durationDistance: distanceInMeters > 0 ? distanceInMeters : undefined,
      targetType: this.getTargetTypeForPace(workout.pace),
      ...this.getTargetValuesForPace(workout.pace, paceZones)
    };
  }

  private createSimpleWorkoutStepFromDayDetails(
    dayDetails: DayDetails,
    messageIndex: number,
    paceZones?: PaceZones
  ): FitWorkoutStep {
    const intensity = this.getIntensityFromTags(dayDetails.tags) || this.getIntensityFromPace(dayDetails.pace);
    const distanceInMeters = this.convertDistanceToMeters(dayDetails.dist, dayDetails.sourceUnits);

    return {
      messageIndex,
      wktStepName: dayDetails.title,
      notes: dayDetails.desc,
      intensity,
      durationType: distanceInMeters > 0 ? FitDurationType.Distance : FitDurationType.Open,
      durationDistance: distanceInMeters > 0 ? distanceInMeters : undefined,
      targetType: this.getTargetTypeForPace(dayDetails.pace),
      ...this.getTargetValuesForPace(dayDetails.pace, paceZones)
    };
  }

  private determineSport(workout: PlannedWorkout): FitSport {
    const tags = workout.tags;
    
    if (tags.includes('Run')) return FitSport.Running;
    if (tags.includes('Cross Train')) return FitSport.Training;
    
    // Default to running for most training plan workouts
    return FitSport.Running;
  }

  private determineSportFromTags(tags: string[]): FitSport {
    if (tags.includes('Run')) return FitSport.Running;
    if (tags.includes('Cross Train')) return FitSport.Training;
    
    return FitSport.Running;
  }

  private determineSubSport(workout: PlannedWorkout): FitSubSport | undefined {
    const description = workout.description.toLowerCase();
    
    if (description.includes('treadmill')) return FitSubSport.Treadmill;
    if (description.includes('track')) return FitSubSport.Track;
    if (description.includes('trail')) return FitSubSport.Trail;
    
    // Default to road/street running
    return FitSubSport.Street;
  }

  private getIntensityFromTags(tags: string[]): FitIntensity {
    if (tags.includes('Rest')) return FitIntensity.Rest;
    if (tags.includes('Long Run')) return FitIntensity.Active;
    if (tags.includes('Speedwork')) return FitIntensity.Interval;
    
    return FitIntensity.Active;
  }

  private getIntensityFromPace(pace?: string): FitIntensity {
    if (!pace) return FitIntensity.Active;
    
    const lowerPace = pace.toLowerCase();
    if (lowerPace.includes('recovery')) return FitIntensity.Recovery;
    if (lowerPace.includes('easy')) return FitIntensity.Active;
    if (lowerPace.includes('threshold') || lowerPace.includes('tempo')) return FitIntensity.Active;
    if (lowerPace.includes('interval') || lowerPace.includes('repetition')) return FitIntensity.Interval;
    
    return FitIntensity.Active;
  }

  private parseIntensityFromText(text: string): FitIntensity {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('threshold') || lowerText.includes('tempo') || lowerText.includes('lt')) {
      return FitIntensity.Active;
    }
    if (lowerText.includes('interval') || lowerText.includes('vo2') || lowerText.includes('fast')) {
      return FitIntensity.Interval;
    }
    return FitIntensity.Active;
  }

  private getTargetTypeForPace(_pace?: string): FitTargetType {
    // For now, default to heart rate zones since they're most universally supported
    // TODO: Add pace/speed target support when we have better pace zone data
    return FitTargetType.HeartRate;
  }

  private getTargetValuesForPace(pace?: string, _paceZones?: PaceZones): Partial<FitWorkoutStep> {
    if (!pace) {
      return {
        targetHrZone: 2 // Default to HR Zone 2 (aerobic base)
      };
    }

    const lowerPace = pace.toLowerCase();
    
    // Map pace types to heart rate zones
    if (lowerPace.includes('recovery')) {
      return { targetHrZone: 1 };
    } else if (lowerPace.includes('easy') || lowerPace.includes('long')) {
      return { targetHrZone: 2 };
    } else if (lowerPace.includes('marathon')) {
      return { targetHrZone: 3 };
    } else if (lowerPace.includes('threshold') || lowerPace.includes('tempo')) {
      return { targetHrZone: 4 };
    } else if (lowerPace.includes('interval') || lowerPace.includes('repetition')) {
      return { targetHrZone: 5 };
    }

    // Default
    return { targetHrZone: 2 };
  }

  private convertUnitToDurationType(unit: string): FitDurationType {
    switch (unit.toLowerCase()) {
      case 'min':
      case 'minutes':
      case 'sec':
      case 'seconds':
        return FitDurationType.Time;
      case 'km':
      case 'mi':
      case 'm':
      case 'meters':
      case 'miles':
      case 'kilometers':
        return FitDurationType.Distance;
      default:
        return FitDurationType.Time;
    }
  }

  private convertDistanceToMeters(distance: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'km':
      case 'kilometers':
        return distance * 1000;
      case 'mi':
      case 'miles':
        return distance * 1609.34;
      case 'm':
      case 'meters':
        return distance;
      default:
        // Assume km if not specified
        return distance * 1000;
    }
  }
}

// Parsed workout structure
interface ParsedWorkout {
  isStructured: boolean;
  type: 'simple' | 'interval' | 'tempo' | 'warmup_main_cooldown';
  repetitions?: number;
  workDuration?: number;
  workUnit?: 'min' | 'km' | 'mi' | 'm';
  workIntensity?: FitIntensity;
  restDuration?: number;
  restUnit?: 'min' | 'km' | 'mi' | 'm';
  originalDescription: string;
}
