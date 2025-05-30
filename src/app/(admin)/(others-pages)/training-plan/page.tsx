"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import { ChevronDownIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import { saveTrainingPlan } from "@/lib/supabase-service";

interface Plan {
  id: string;
  name: string;
  description: string;
  units: string;
  type: string;
}

export default function TrainingPlanSelector() {
  // State for form values
  const [provider, setProvider] = useState("pfitz");
  const [raceDistance, setRaceDistance] = useState("");
  const [planId, setPlanId] = useState("");
  const [goalHours, setGoalHours] = useState("");
  const [goalMinutes, setGoalMinutes] = useState("");
  const [goalSeconds, setGoalSeconds] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [calculatedPaces, setCalculatedPaces] = useState<{
    easy: { min: number; sec: number };
    marathon: { min: number; sec: number };
    threshold: { min: number; sec: number };
    interval: { min: number; sec: number };
    recovery: { min: number; sec: number };
    long: { min: number; sec: number };
  } | null>(null);
  const [useKilometers, setUseKilometers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { user, loading } = useAuth();

  // Provider options
  const providerOptions = [
    { value: "pfitz", label: "Pfitzinger / Douglas" },
    // Add more providers as they become available
  ];

  // Race distances based on plan folders
  const raceDistanceOptions = [
    { value: "5k", label: "5K" },
    { value: "10k", label: "10K" },
    { value: "half-marathon", label: "Half Marathon" },
    { value: "marathon", label: "Marathon" },
    { value: "base", label: "Base Building" },
    { value: "recovery", label: "Recovery" },
    { value: "multiple-distance", label: "Multiple Distances" },
  ];

  // Load available plans when provider and race distance change
  useEffect(() => {
    if (provider && raceDistance) {
      setIsLoading(true);
      
      // In a real application, we would fetch this data from the plans directory
      // For demo, we're hardcoding sample plans based on actual file structure
      const fetchPlans = async () => {
        try {
          let demoPlans: Plan[] = [];
          
          // Map plans based on the race distance
          switch (raceDistance) {
            case "5k":
              demoPlans = [
                { 
                  id: "frr_5k_01", 
                  name: "Faster Road Racing: 5K Schedule 1",
                  description: "30-40 miles per week plan for runners who have been training 25-35 miles per week",
                  units: "mi",
                  type: "5K"
                },
                { 
                  id: "frr_5k_02", 
                  name: "Faster Road Racing: 5K Schedule 2",
                  description: "40-50 miles per week plan for runners who have been training 35-45 miles per week",
                  units: "mi",
                  type: "5K"
                },
                { 
                  id: "frr_5k_03", 
                  name: "Faster Road Racing: 5K Schedule 3",
                  description: "55-70 miles per week plan for runners who have been training 45-60 miles per week",
                  units: "mi",
                  type: "5K"
                }
              ];
              break;
            case "10k":
              demoPlans = [
                { 
                  id: "frr_8k10k_01", 
                  name: "Faster Road Racing: 8K-10K Schedule 1",
                  description: "30-42 miles per week plan for runners who have been training 25-35 miles per week",
                  units: "mi",
                  type: "10K"
                },
                { 
                  id: "frr_8k10k_02", 
                  name: "Faster Road Racing: 8K-10K Schedule 2",
                  description: "42-55 miles per week plan for runners who have been training 35-45 miles per week",
                  units: "mi",
                  type: "10K"
                }
              ];
              break;
            case "half-marathon":
              demoPlans = [
                { 
                  id: "pfitz_half_12_47", 
                  name: "Advanced Marathoning: Half Marathon 12/47",
                  description: "12 week plan with peak mileage of 47 miles per week",
                  units: "mi",
                  type: "Half Marathon"
                },
                { 
                  id: "pfitz_half_12_63", 
                  name: "Advanced Marathoning: Half Marathon 12/63",
                  description: "12 week plan with peak mileage of 63 miles per week",
                  units: "mi",
                  type: "Half Marathon"
                }
              ];
              break;
            case "marathon":
              demoPlans = [
                { 
                  id: "pfitz_12_55", 
                  name: "Advanced Marathoning: Marathon 12/55",
                  description: "12 week plan with peak mileage of 55 miles per week",
                  units: "mi",
                  type: "Marathon"
                },
                { 
                  id: "pfitz_18_70", 
                  name: "Advanced Marathoning: Marathon 18/70",
                  description: "18 week plan with peak mileage of 70 miles per week",
                  units: "mi",
                  type: "Marathon"
                },
                { 
                  id: "pfitz_18_85", 
                  name: "Advanced Marathoning: Marathon 18/85",
                  description: "18 week plan with peak mileage of 85 miles per week",
                  units: "mi",
                  type: "Marathon"
                }
              ];
              break;
            case "base":
              demoPlans = [
                { 
                  id: "frr_bt_01", 
                  name: "Faster Road Racing: Base Training Schedule 1",
                  description: "30 miles per week base building plan",
                  units: "mi",
                  type: "Base"
                },
                { 
                  id: "frr_bt_02", 
                  name: "Faster Road Racing: Base Training Schedule 2",
                  description: "45 miles per week base building plan",
                  units: "mi",
                  type: "Base"
                }
              ];
              break;
            case "recovery":
              demoPlans = [
                { 
                  id: "pfitz_55_recovery", 
                  name: "Advanced Marathoning: Recovery Plan",
                  description: "4 week recovery plan after a marathon",
                  units: "mi",
                  type: "Recovery"
                }
              ];
              break;
            case "multiple-distance":
              demoPlans = [
                { 
                  id: "frr_multiple_distances_01", 
                  name: "Faster Road Racing: Multiple Race Distances Schedule 1",
                  description: "35-45 miles per week plan for multiple race distances",
                  units: "mi",
                  type: "Multiple Distances"
                },
                { 
                  id: "frr_multiple_distances_03", 
                  name: "Faster Road Racing: Multiple Race Distances Schedule 3",
                  description: "60-70 miles per week plan for multiple race distances",
                  units: "mi",
                  type: "Multiple Distances"
                }
              ];
              break;
          }
          
          setPlans(demoPlans);
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching plans:", error);
          setIsLoading(false);
        }
      };

      fetchPlans();
    } else {
      setPlans([]);
    }
  }, [provider, raceDistance]);

  // Reset plan when plans change
  useEffect(() => {
    setPlanId("");
    setSelectedPlan(null);
  }, [plans]);

  // Update selected plan when planId changes
  useEffect(() => {
    if (planId) {
      const plan = plans.find(p => p.id === planId);
      setSelectedPlan(plan || null);
    } else {
      setSelectedPlan(null);
    }
  }, [planId, plans]);

  const handleProviderChange = (value: string) => {
    setProvider(value);
  };

  const handleRaceDistanceChange = (value: string) => {
    setRaceDistance(value);
  };

  const handlePlanChange = (value: string) => {
    setPlanId(value);
  };

  // Convert between kilometers and miles
  const kmToMiles = (km: number): number => km * 0.621371;
  const milesToKm = (miles: number): number => miles * 1.609344;
  
  const calculatePaces = async () => {
    // Check if user is logged in
    if (!user) {
      alert("You need to be signed in to save training plans");
      router.push('/signin');
      return;
    }

    // Convert race time inputs to seconds
    const hours = parseInt(goalHours) || 0;
    const minutes = parseInt(goalMinutes) || 0;
    const seconds = parseInt(goalSeconds) || 0;
    const totalRaceSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalRaceSeconds === 0 || !raceDistance || !selectedPlan) {
      alert("Please enter a valid goal time and select a training plan");
      return;
    }

    setErrorMessage("");
    setSaving(true);

    try {
      // Determine distance in meters based on the race type
      let distanceInMeters = 0;
      switch(raceDistance) {
        case "5k": distanceInMeters = 5000; break;
        case "10k": distanceInMeters = 10000; break;
        case "half-marathon": distanceInMeters = 21097.5; break;
        case "marathon": distanceInMeters = 42195; break;
        case "base": 
        case "recovery": 
        case "multiple-distance": 
          // For non-race specific plans, use 10k as reference
          distanceInMeters = 10000; break;
        default: distanceInMeters = 10000;
      }

      // Calculate pace in seconds per kilometer
      const pacePerKm = totalRaceSeconds / (distanceInMeters / 1000);
      
      // Display units for the user (km vs miles)
      const displayUnits = useKilometers ? "km" : "mi";
      
      // Convert pace to the appropriate units for calculation
      // If plan is in miles but user wants km, or vice versa, convert accordingly
      let basePace: number;
      
      if ((selectedPlan.units === "mi" && displayUnits === "km")) {
        // Convert seconds/km to seconds/mile for internal calculation
        basePace = kmToMiles(pacePerKm);
      } else if ((selectedPlan.units === "km" && displayUnits === "mi")) {
        // Convert seconds/mile to seconds/km for internal calculation
        basePace = milesToKm(pacePerKm);
      } else {
        // Units match, use as is
        basePace = pacePerKm;
      }
      
      // Calculate all paces based on relationships 
      const recoveryPace = Math.round(basePace * 1.2);
      const easyPace = Math.round(basePace * 1.1);
      const longPace = Math.round(basePace * 1.15);
      const marathonPace = Math.round(basePace * 1.0);
      const thresholdPace = Math.round(basePace * 0.9);
      const intervalPace = Math.round(basePace * 0.85);
      
      // Convert paces back to display units if necessary
      const displayPaces = {
        recovery: recoveryPace,
        easy: easyPace,
        long: longPace,
        marathon: marathonPace,
        threshold: thresholdPace,
        interval: intervalPace
      };
      
      // Format seconds to minutes:seconds
      const formatPace = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return { min: mins, sec: secs };
      };
      
      const calculatedPaces = {
        easy: formatPace(displayPaces.easy),
        marathon: formatPace(displayPaces.marathon),
        threshold: formatPace(displayPaces.threshold),
        interval: formatPace(displayPaces.interval),
        recovery: formatPace(displayPaces.recovery),
        long: formatPace(displayPaces.long)
      };

      // Create the planData object for Supabase and localStorage
      const planData = {
        plan: selectedPlan,
        paces: calculatedPaces,
        units: useKilometers ? "km" : "mi",
        raceDistance: raceDistance,
        goalTime: {
          hours: hours,
          minutes: minutes,
          seconds: seconds
        }
      };
      
      // Save to both localStorage (for backward compatibility) and Supabase
      localStorage.setItem('trainingPlanData', JSON.stringify(planData));
      
      // Save to Supabase
      await saveTrainingPlan(planData);
      
      // Update state with calculated paces
      setCalculatedPaces(calculatedPaces);
      
    } catch (error) {
      console.error('Error calculating paces:', error);
      setErrorMessage("Failed to save your training plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Generate plan options
  const planOptions = plans.map(plan => ({
    value: plan.id,
    label: plan.name
  }));

  return (
    <div>
      <PageBreadcrumb pageTitle="Training Plan Selector" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Plan Selection Form */}
        <ComponentCard title="Select Your Training Plan" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Provider Selection */}
            <div>
              <Label>Plan Provider</Label>
              <div className="relative">
                <Select
                  options={providerOptions}
                  placeholder="Select Provider"
                  onChange={handleProviderChange}
                  defaultValue={provider}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon/>
                </span>
              </div>
            </div>

            {/* Race Distance */}
            <div>
              <Label>Race Distance</Label>
              <div className="relative">
                <Select
                  options={raceDistanceOptions}
                  placeholder="Select Race Distance"
                  onChange={handleRaceDistanceChange}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon/>
                </span>
              </div>
            </div>

            {/* Training Plan Selection */}
            <div className="md:col-span-2">
              <Label>Training Plan</Label>
              <div className="relative">
                <Select
                  options={planOptions}
                  placeholder={isLoading ? "Loading plans..." : "Select Training Plan"}
                  onChange={handlePlanChange}
                  className={isLoading ? "opacity-50" : ""}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon/>
                </span>
              </div>
            </div>

            {/* Plan Description */}
            {selectedPlan && (
              <div className="md:col-span-2">
                <div className="p-4 border rounded-lg border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03]">
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    {selectedPlan.description}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Units: {selectedPlan.units === "km" ? "Kilometers" : "Miles"}
                  </p>
                </div>
              </div>
            )}

            {/* Units Toggle */}
            <div className="md:col-span-2 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={useKilometers}
                  onChange={setUseKilometers}
                  id="units-toggle"
                />
                <label htmlFor="units-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  Use kilometers instead of miles
                </label>
              </div>
            </div>

            {/* Goal Race Time */}
            <div className="md:col-span-2">
              <Label>Goal Race Time</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Hours"
                    defaultValue={goalHours}
                    onChange={(e) => setGoalHours(e.target.value)}
                    min="0"
                  />
                </div>
                <span className="text-gray-700 dark:text-gray-400">:</span>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Minutes"
                    defaultValue={goalMinutes}
                    onChange={(e) => setGoalMinutes(e.target.value)}
                    min="0"
                    max="59"
                  />
                </div>
                <span className="text-gray-700 dark:text-gray-400">:</span>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Seconds"
                    defaultValue={goalSeconds}
                    onChange={(e) => setGoalSeconds(e.target.value)}
                    min="0"
                    max="59"
                  />
                </div>
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="md:col-span-2">
                <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Calculate Button */}
            <div className="md:col-span-2">
              <Button 
                variant="primary" 
                onClick={calculatePaces}
                disabled={saving || !selectedPlan || (goalHours === "" && goalMinutes === "" && goalSeconds === "")}
              >
                {saving ? "Saving..." : "Calculate Training Paces"}
              </Button>
              {!user && !loading && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Sign in to save your training plans across devices
                </p>
              )}
            </div>
          </div>
        </ComponentCard>

        {/* Calculated Paces */}
        {calculatedPaces && (
          <ComponentCard title="Training Paces" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Easy / General Aerobic</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.easy.min}:{String(calculatedPaces.easy.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {useKilometers ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Marathon Pace</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.marathon.min}:{String(calculatedPaces.marathon.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {useKilometers ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Threshold</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.threshold.min}:{String(calculatedPaces.threshold.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {useKilometers ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Interval / VO₂max</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.interval.min}:{String(calculatedPaces.interval.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {useKilometers ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Recovery</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.recovery.min}:{String(calculatedPaces.recovery.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {useKilometers ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Long Run</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.long.min}:{String(calculatedPaces.long.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {useKilometers ? "kilometer" : "mile"}
                </p>
              </div>
            </div>
            
            {/* Add button to navigate to calendar */}
            <div className="mt-6 flex justify-end">
              <Button 
                variant="primary" 
                onClick={() => router.push('/calendar')}
              >
                View in Calendar
              </Button>
            </div>
          </ComponentCard>
        )}
      </div>
    </div>
  );
}
