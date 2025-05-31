'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { calculateTrainingPaces, RecentPerformanceInput, TrainingPaces } from '@/lib/paceCalculator';
import { PlanConfiguration, TrainingPlan, WeeklySchedule, ScheduledRun } from '@/lib/planGenerator';
import { supabase } from '@/lib/supabase';

// Helper function to format pace from seconds/km to MM:SS/km
const formatPace = (secondsPerKm: number): string => {
  if (isNaN(secondsPerKm) || secondsPerKm <= 0) return 'N/A';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Helper function to format a pace range for display
const formatPacesForDisplay = (paceRange: { minPerKm: number; maxPerKm: number }): string => {
  if (!paceRange || isNaN(paceRange.minPerKm) || isNaN(paceRange.maxPerKm)) return 'N/A';
  return `${formatPace(paceRange.minPerKm)} - ${formatPace(paceRange.maxPerKm)} /km`;
};


export default function GeneratePlanPage() {
  const [formData, setFormData] = useState({
    raceName: '',
    raceDistance: '5k',
    customRaceDistanceValue: '',
    customRaceDistanceUnits: 'km' as 'km' | 'miles', // Initialize with a default valid value
    raceDate: '',
    recentRaceDistance: '5k',
    recentRaceTime: '',
    customRecentRaceDistanceValue: '',
    customRecentRaceDistanceUnits: 'km' as 'km' | 'miles', // Initialize with a default valid value
  });
  const [calculatedPaces, setCalculatedPaces] = useState<TrainingPaces | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPlan(null);

    // Basic Validation (can be expanded)
    if (!formData.raceDate) {
      setError('Please select a race date.');
      setIsLoading(false);
      return;
    }
    if (formData.raceDistance === 'Custom' && !formData.customRaceDistanceValue) {
      setError('Please enter a custom race distance.');
      setIsLoading(false);
      return;
    }
    if (!formData.recentRaceTime) {
      setError('Please enter your recent race time.');
      setIsLoading(false);
      return;
    }

    // --- Placeholder for Plan Generation Logic ---
    // In the next steps, we'll call the pace calculation and plan generation services here.
    console.log('Form Submitted', formData);
    try {
      const recentPerformance: RecentPerformanceInput = {
        recentRaceDistance: formData.recentRaceDistance,
        recentRaceTime: formData.recentRaceTime,
        customRaceDistanceValue: formData.customRecentRaceDistanceValue,
        customRaceDistanceUnits: formData.customRecentRaceDistanceUnits,
      };

      // Step 1: Calculate training paces using the modular API
      const paceResponse = await fetch('/api/pace-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performanceInput: recentPerformance }),
      });

      if (!paceResponse.ok) {
        const paceError = await paceResponse.json();
        throw new Error(paceError.error || 'Failed to calculate training paces');
      }

      const { trainingPaces } = await paceResponse.json();
      setCalculatedPaces(trainingPaces);

      const planConfig: PlanConfiguration = {
        raceName: formData.raceName,
        raceDistance: formData.raceDistance,
        customRaceDistanceValue: formData.customRaceDistanceValue,
        customRaceDistanceUnits: formData.customRaceDistanceUnits as 'km' | 'miles',
        raceDate: formData.raceDate,
        trainingPaces, // Use paces from API
      };

      // Step 2: Generate the plan using the modular API
      const { data: { session } } = await supabase.auth.getSession();
      const access_token = session?.access_token;

      console.log('Calling training plan API with config:', planConfig);
      console.log('Session available:', !!session);
      console.log('Access token available:', !!access_token);

      const planResponse = await fetch('/api/training-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(access_token && { 'Authorization': `Bearer ${access_token}` }),
        },
        body: JSON.stringify(planConfig),
      });

      console.log('Plan response status:', planResponse.status);
      console.log('Plan response headers:', Object.fromEntries(planResponse.headers.entries()));

      if (!planResponse.ok) {
        const planErrorText = await planResponse.text();
        console.log('Plan error response:', planErrorText);
        
        try {
          const planError = JSON.parse(planErrorText);
          throw new Error(planError.error || `Failed to generate plan: ${planResponse.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to generate plan (${planResponse.status}): ${planErrorText}`);
        }
      }

      const { plan: generatedPlan } = await planResponse.json();
      setPlan(generatedPlan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-black dark:text-white">
      <h1 className="text-3xl font-bold mb-8 text-center">Generate Your Training Plan</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        {/* Race Details Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Race Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="raceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Name (Optional)</label>
              <input
                type="text"
                name="raceName"
                id="raceName"
                value={formData.raceName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="raceDistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Distance</label>
              <select
                name="raceDistance"
                id="raceDistance"
                value={formData.raceDistance}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="5k">5k</option>
                <option value="10k">10k</option>
                <option value="Half Marathon">Half Marathon</option>
                <option value="Marathon">Marathon</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          {formData.raceDistance === 'Custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="customRaceDistanceValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Distance</label>
                <input
                  type="number"
                  name="customRaceDistanceValue"
                  id="customRaceDistanceValue"
                  value={formData.customRaceDistanceValue}
                  onChange={handleChange}
                  min="0.1"
                  step="0.1"
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., 25"
                />
              </div>
              <div>
                <label htmlFor="customRaceDistanceUnits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Units</label>
                <select
                  name="customRaceDistanceUnits"
                  id="customRaceDistanceUnits"
                  value={formData.customRaceDistanceUnits}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="km">km</option>
                  <option value="miles">miles</option>
                </select>
              </div>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="raceDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Date</label>
            <input
              type="date"
              name="raceDate"
              id="raceDate"
              value={formData.raceDate}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </section>

        {/* Current Fitness Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Current Fitness</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="recentRaceDistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Race Distance</label>
              <select
                name="recentRaceDistance"
                id="recentRaceDistance"
                value={formData.recentRaceDistance}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="1 mile">1 Mile</option>
                <option value="5k">5k</option>
                <option value="10k">10k</option>
                <option value="Half Marathon">Half Marathon</option>
                <option value="Marathon">Marathon</option>
              </select>
            </div>
            <div>
              <label htmlFor="recentRaceTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Race Time</label>
              <input
                type="text"
                name="recentRaceTime"
                id="recentRaceTime"
                value={formData.recentRaceTime}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="MM:SS or HH:MM:SS"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>
      </form>

      {isLoading && <p>Generating your training plan...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {calculatedPaces && (
        <div className="mt-6 p-4 border border-gray-300 rounded-md bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Your Training Paces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">ENDURANCE PACES</h3>
              <p><strong>Easy:</strong> {formatPacesForDisplay(calculatedPaces.easyPace)}</p>
              <p><strong>Tempo:</strong> {formatPacesForDisplay(calculatedPaces.tempoPace)}</p>
              <p><strong>Long Run:</strong> {formatPacesForDisplay(calculatedPaces.longRunPace)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">SPEED PACES</h3>
              <p><strong>Interval:</strong> {formatPacesForDisplay(calculatedPaces.intervalPace)}</p>
              {calculatedPaces.vdot && (
                <p><strong>VDOT:</strong> {calculatedPaces.vdot.toFixed(1)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {plan && (
        <div className="mt-6 p-4 border border-gray-300 rounded-md bg-white">
          <h2 className="text-xl font-semibold mb-2">Your Generated Training Plan</h2>
          <p><strong>Race:</strong> {plan.planConfiguration.raceName || 'N/A'}</p>
          <p><strong>Race Date:</strong> {plan.planConfiguration.raceDate}</p>
          <p><strong>Total Weeks:</strong> {plan.totalWeeks}</p>
          <p><strong>Plan Start Date:</strong> {plan.startDate}</p>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Weekly Overview:</h3>
            {plan.weeklySchedules.map((week: WeeklySchedule) => (
              <div key={week.weekNumber} className="mb-3 p-3 border border-gray-200 rounded">
                <h4 className="font-semibold">Week {week.weekNumber} ({week.startDate} - {week.endDate})</h4>
                <p className="text-sm text-gray-600 mb-1">{week.summary}</p>
                <ul className="list-disc pl-5">
                  {week.runs.map((run: ScheduledRun) => (
                    <li key={run.date} className="text-sm">
                      {new Date(run.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: {run.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

