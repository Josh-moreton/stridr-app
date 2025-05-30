// FIT file type definitions based on Garmin FIT SDK documentation

export interface FitFileData {
  fileId: FitFileId;
  workout: FitWorkout;
  workoutSteps: FitWorkoutStep[];
}

export interface FitFileId {
  type: number; // 5 for workout files
  manufacturer: number;
  product: number;
  serialNumber: number;
  timeCreated: number; // Unix timestamp
}

export interface FitWorkout {
  wktName: string;
  sport: FitSport;
  subSport?: FitSubSport;
  numValidSteps: number;
  poolLength?: number; // for swimming workouts
  poolLengthUnit?: number;
}

export interface FitWorkoutStep {
  messageIndex: number;
  wktStepName?: string;
  notes?: string;
  intensity: FitIntensity;
  durationType: FitDurationType;
  durationValue?: number;
  durationTime?: number; // in seconds
  durationDistance?: number; // in meters
  targetType: FitTargetType;
  targetValue?: number;
  targetHrZone?: number;
  targetPowerZone?: number;
  targetSpeedZone?: number;
  customTargetValueLow?: number;
  customTargetValueHigh?: number;
  customTargetHeartRateLow?: number;
  customTargetHeartRateHigh?: number;
  customTargetPowerLow?: number;
  customTargetPowerHigh?: number;
  customTargetSpeedLow?: number; // m/s
  customTargetSpeedHigh?: number; // m/s
}

export interface FitWorkoutRepeatStep extends FitWorkoutStep {
  repeatFrom: number;
  repetitions: number;
}

// Enums based on FIT SDK documentation
export enum FitSport {
  Generic = 0,
  Running = 1,
  Cycling = 2,
  Transition = 3,
  FitnessEquipment = 4,
  Swimming = 5,
  Basketball = 6,
  Soccer = 7,
  Tennis = 8,
  AmericanFootball = 9,
  Training = 10,
  Walking = 11,
  CrossCountrySkiing = 12,
  AlpineSkiing = 13,
  Snowboarding = 14,
  Rowing = 15,
  Mountaineering = 16,
  Hiking = 17,
  Multisport = 18,
  Paddling = 19
}

export enum FitSubSport {
  Generic = 0,
  Treadmill = 1,
  Street = 2,
  Trail = 3,
  Track = 4,
  Spin = 5,
  IndoorCycling = 6,
  Road = 7,
  Mountain = 8,
  Downhill = 9,
  Recumbent = 10,
  Cyclocross = 11,
  HandCycling = 12,
  TrackCycling = 13,
  IndoorRowing = 14,
  Elliptical = 15,
  StairClimbing = 16,
  LapSwimming = 17,
  OpenWater = 18,
  FlexibilityTraining = 19,
  StrengthTraining = 20,
  WarmUp = 21,
  Match = 22,
  Exercise = 23,
  Challenge = 24,
  IndoorSkiing = 25,
  CardioTraining = 26,
  IndoorWalking = 27,
  EBikeFitness = 28,
  Bmx = 29,
  CasualWalking = 30,
  SpeedWalking = 31,
  BikeToRunTransition = 32,
  RunToBikeTransition = 33,
  SwimToBikeTransition = 34,
  Atv = 35,
  Motocross = 36,
  Backcountry = 37,
  Resort = 38,
  RcDrone = 39,
  Wingsuit = 40,
  Whitewater = 41,
  SkateSkiing = 42,
  Yoga = 43,
  Pilates = 44,
  IndoorRunning = 45,
  GravelCycling = 46,
  EBikeMountain = 47,
  Commuting = 48,
  MixedSurface = 49,
  Navigate = 50,
  TrackMe = 51,
  Map = 52,
  SingleGasDiving = 53,
  MultiGasDiving = 54,
  GaugeDiving = 55,
  ApneaDiving = 56,
  ApneaHunting = 57,
  VirtualActivity = 58,
  Obstacle = 59
}

export enum FitIntensity {
  Active = 0,
  Rest = 1,
  Warmup = 2,
  Cooldown = 3,
  Recovery = 4,
  Interval = 5,
  Other = 6
}

export enum FitDurationType {
  Time = 0,
  Distance = 1,
  HeartRateAbove = 2,
  HeartRateBelow = 3,
  CaloriesBurned = 4,
  Open = 5,
  RepeatUntilStepsComplete = 6,
  RepeatUntilTime = 7,
  RepeatUntilDistance = 8,
  RepeatUntilCalories = 9,
  RepeatUntilHrAbove = 10,
  RepeatUntilHrBelow = 11,
  RepeatUntilPowerAbove = 12,
  RepeatUntilPowerBelow = 13,
  PowerAbove = 14,
  PowerBelow = 15,
  TrainingPeaksTss = 16,
  RepeatUntilPowerLastLapAbove = 17,
  RepeatUntilMaxPowerLastLapAbove = 18,
  Power3sAbove = 19,
  Power10sAbove = 20,
  Power30sAbove = 21,
  PowerLapAbove = 22,
  WktStepIndex = 23,
  RepetitionTime = 24,
  Reps = 28
}

export enum FitTargetType {
  Speed = 0,
  HeartRate = 1,
  Open = 2,
  Cadence = 3,
  Power = 4,
  Grade = 5,
  Resistance = 6,
  SwimStroke = 7,
  SpeedLap = 8,
  HeartRateLap = 9,
  CadenceLap = 10,
  PowerLap = 11,
  GradeLap = 12,
  ResistanceLap = 13
}

// Conversion interfaces for our application
export interface WorkoutConversionOptions {
  userHeartRateZones?: HeartRateZones;
  userPowerZones?: PowerZones;
  userSpeedZones?: SpeedZones;
  defaultIntensityMapping?: Record<string, FitIntensity>;
  units: 'metric' | 'imperial';
}

export interface HeartRateZones {
  zone1: { min: number; max: number };
  zone2: { min: number; max: number };
  zone3: { min: number; max: number };
  zone4: { min: number; max: number };
  zone5: { min: number; max: number };
}

export interface PowerZones {
  zone1: { min: number; max: number };
  zone2: { min: number; max: number };
  zone3: { min: number; max: number };
  zone4: { min: number; max: number };
  zone5: { min: number; max: number };
  zone6: { min: number; max: number };
}

export interface SpeedZones {
  recovery: { min: number; max: number }; // m/s
  easy: { min: number; max: number };
  marathon: { min: number; max: number };
  threshold: { min: number; max: number };
  interval: { min: number; max: number };
  repetition: { min: number; max: number };
}

export interface FitGenerationResult {
  success: boolean;
  fitFile?: Uint8Array;
  filename?: string;
  error?: string;
  metadata?: {
    workoutName: string;
    sport: string;
    duration?: number;
    distance?: number;
    stepCount: number;
  };
}
