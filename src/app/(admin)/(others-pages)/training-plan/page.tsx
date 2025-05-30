"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { ChevronDownIcon } from "@/icons";

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
  const [goalPaceMinutes, setGoalPaceMinutes] = useState("");
  const [goalPaceSeconds, setGoalPaceSeconds] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [calculatedPaces, setCalculatedPaces] = useState<any>(null);

  // Provider options
  const providerOptions = [
    { value: "pfitz", label: "Pfitzinger / Douglas" },
    // Add more providers as they become available
  ];

  // Race distances
  const raceDistanceOptions = [
    { value: "5k", label: "5K" },
    { value: "10k", label: "10K" },
    { value: "15k", label: "15K" },
    { value: "10m", label: "10 Miles" },
    { value: "half", label: "Half Marathon" },
    { value: "marathon", label: "Marathon" },
  ];

  // Load available plans when provider and race distance change
  useEffect(() => {
    if (provider && raceDistance) {
      setIsLoading(true);
      
      // Simulating API call - in real life this would fetch from backend
      // In our case, we'd fetch the plans from the plans/pfitz/[distance] directories
      const fetchPlans = async () => {
        try {
          // For demo, we're hardcoding some plans
          const demoPlans = [
            { 
              id: "frr_15k_10m_01", 
              name: "Faster Road Racing: 15k/10 Miles Schedule 1",
              description: "35-45 miles per week plan",
              units: "mi",
              type: raceDistance
            },
            { 
              id: "frr_15k_10m_02", 
              name: "Faster Road Racing: 15k/10 Miles Schedule 2",
              description: "45-60 miles per week plan",
              units: "mi",
              type: raceDistance
            },
            { 
              id: "frr_15k_10m_03", 
              name: "Faster Road Racing: 15k/10 Miles Schedule 3",
              description: "60-75 miles per week plan",
              units: "mi",
              type: raceDistance
            },
          ];
          
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

  const calculatePaces = () => {
    // Convert time inputs to seconds
    const minutes = parseInt(goalPaceMinutes) || 0;
    const seconds = parseInt(goalPaceSeconds) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds === 0 || !raceDistance || !selectedPlan) {
      alert("Please enter a valid goal pace and select a training plan");
      return;
    }

    // In a production application, we would use the actual calculator
    // import { PfitzingerPaceCalculator } from '../../../paceCalculators/pfitzingerCalculator';
    // const calculator = new PfitzingerPaceCalculator();
    // const paces = calculator.calculatePaces({ 
    //   distance: raceDistance, 
    //   timeInSeconds: totalSeconds 
    // }, selectedPlan.units);
    
    // For demo purposes, let's simulate calculated pace values
    // We'll adjust the paces based on the race distance
    let paceMultiplier = 1.0;
    switch(raceDistance) {
      case "5k": paceMultiplier = 0.9; break;
      case "10k": paceMultiplier = 0.95; break;
      case "half": paceMultiplier = 1.05; break;
      case "marathon": paceMultiplier = 1.1; break;
      default: paceMultiplier = 1.0;
    }
    
    // Base pace is the goal pace entered by the user
    const basePace = totalSeconds;
    
    // Calculate all paces based on relationships from the Pfitzinger calculator
    const recoveryPace = Math.round(basePace * 1.2 * paceMultiplier);
    const easyPace = Math.round(basePace * 1.1 * paceMultiplier);
    const longPace = Math.round(basePace * 1.15 * paceMultiplier);
    const marathonPace = Math.round(basePace * 1.0 * paceMultiplier);
    const thresholdPace = Math.round(basePace * 0.9 * paceMultiplier);
    const intervalPace = Math.round(basePace * 0.85 * paceMultiplier);
    
    const formatPace = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return { min: mins, sec: secs };
    };
    
    const calculatedPaces = {
      easy: formatPace(easyPace),
      marathon: formatPace(marathonPace),
      threshold: formatPace(thresholdPace),
      interval: formatPace(intervalPace),
      recovery: formatPace(recoveryPace),
      long: formatPace(longPace)
    };

    setCalculatedPaces(calculatedPaces);
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

            {/* Goal Pace */}
            <div className="md:col-span-2">
              <Label>Goal Race Pace</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Minutes"
                    defaultValue={goalPaceMinutes}
                    onChange={(e) => setGoalPaceMinutes(e.target.value)}
                  />
                </div>
                <span className="text-gray-700 dark:text-gray-400">:</span>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Seconds"
                    defaultValue={goalPaceSeconds}
                    onChange={(e) => setGoalPaceSeconds(e.target.value)}
                    min="0"
                    max="59"
                  />
                </div>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  per {selectedPlan?.units === "km" ? "km" : "mile"}
                </span>
              </div>
            </div>

            {/* Calculate Button */}
            <div className="md:col-span-2">
              <Button 
                variant="primary" 
                onClick={calculatePaces}
                disabled={!selectedPlan || (!goalPaceMinutes && !goalPaceSeconds)}
              >
                Calculate Training Paces
              </Button>
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
                  per {selectedPlan?.units === "km" ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Marathon Pace</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.marathon.min}:{String(calculatedPaces.marathon.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {selectedPlan?.units === "km" ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Threshold</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.threshold.min}:{String(calculatedPaces.threshold.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {selectedPlan?.units === "km" ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Interval / VO₂max</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.interval.min}:{String(calculatedPaces.interval.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {selectedPlan?.units === "km" ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Recovery</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.recovery.min}:{String(calculatedPaces.recovery.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {selectedPlan?.units === "km" ? "kilometer" : "mile"}
                </p>
              </div>

              <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                <h4 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Long Run</h4>
                <p className="text-2xl font-bold text-brand-500">
                  {calculatedPaces.long.min}:{String(calculatedPaces.long.sec).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per {selectedPlan?.units === "km" ? "kilometer" : "mile"}
                </p>
              </div>
            </div>
          </ComponentCard>
        )}
      </div>
    </div>
  );
}
